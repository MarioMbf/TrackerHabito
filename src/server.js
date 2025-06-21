const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Archivo de datos persistentes
const DATA_FILE = path.join(__dirname, '..', 'data.json');

// Cargar datos desde archivo
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
    }
    return {};
}

// Guardar datos en archivo
function saveData(users) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error al guardar datos:', error);
    }
}

// Almacenamiento persistente
let users = loadData();

// Generar nuevo usuario
app.post('/api/user/create', (req, res) => {
    const userId = uuidv4();
    users[userId] = {
        id: userId,
        createdAt: new Date().toISOString(),
        habits: {},
        stats: {
            totalHabits: 0,
            totalCompletions: 0,
            currentStreak: 0,
            longestStreak: 0
        }
    };
    saveData(users);
    res.json({ userId, message: 'Usuario creado exitosamente' });
});

// Iniciar sesión con ID
app.post('/api/user/login', (req, res) => {
    const { userId } = req.body;
    if (users[userId]) {
        res.json({ success: true, user: users[userId] });
    } else {
        res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
});

// Obtener datos del usuario
app.get('/api/user/:userId', (req, res) => {
    const { userId } = req.params;
    if (users[userId]) {
        res.json(users[userId]);
    } else {
        res.status(404).json({ error: 'Usuario no encontrado' });
    }
});

// Crear nuevo hábito
app.post('/api/habits', (req, res) => {
    const { userId, habitName, description, category } = req.body;
    if (!users[userId]) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const habitId = uuidv4();
    users[userId].habits[habitId] = {
        id: habitId,
        name: habitName,
        description: description || '',
        category: category || 'General',
        createdAt: new Date().toISOString(),
        completions: [],
        streak: 0
    };
    
    users[userId].stats.totalHabits++;
    saveData(users);
    res.json({ success: true, habitId });
});

// Marcar hábito como completado
app.post('/api/habits/complete', (req, res) => {
    const { userId, habitId, date } = req.body;
    const completionDate = date || new Date().toISOString().split('T')[0];
    
    if (!users[userId] || !users[userId].habits[habitId]) {
        return res.status(404).json({ error: 'Usuario o hábito no encontrado' });
    }
    
    const habit = users[userId].habits[habitId];
    if (!habit.completions.includes(completionDate)) {
        habit.completions.push(completionDate);
        habit.completions.sort();
        users[userId].stats.totalCompletions++;
        
        // Calcular racha
        updateStreaks(users[userId]);
        saveData(users);
    }
    
    res.json({ success: true });
});

// Cache para análisis (evita recalcular constantemente)
const analyticsCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Obtener análisis de hábitos
app.get('/api/analytics/:userId', (req, res) => {
    const { userId } = req.params;
    if (!users[userId]) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar cache
    const cacheKey = `${userId}_${users[userId].stats.totalCompletions}`;
    const cached = analyticsCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return res.json(cached.data);
    }
    
    const analytics = generateAnalytics(users[userId]);
    
    // Guardar en cache
    analyticsCache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
    });
    
    // Limpiar cache viejo
    if (analyticsCache.size > 100) {
        const oldestKey = analyticsCache.keys().next().value;
        analyticsCache.delete(oldestKey);
    }
    
    res.json(analytics);
});

// Función para actualizar rachas
function updateStreaks(user) {
    let maxStreak = 0;
    let currentStreak = 0;
    
    Object.values(user.habits).forEach(habit => {
        const streak = calculateStreak(habit.completions);
        habit.streak = streak;
        maxStreak = Math.max(maxStreak, streak);
    });
    
    user.stats.longestStreak = maxStreak;
    user.stats.currentStreak = getCurrentStreak(user);
}

// Calcular racha de un hábito (optimizado)
function calculateStreak(completions) {
    if (completions.length === 0) return 0;
    
    // Ordenar fechas de más reciente a más antigua
    const sortedDates = completions.slice().sort((a, b) => new Date(b) - new Date(a));
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Si no completó hoy ni ayer, la racha es 0
    if (!sortedDates.includes(today) && !sortedDates.includes(yesterdayStr)) {
        return 0;
    }
    
    let streak = 0;
    let expectedDate = new Date();
    
    // Si no completó hoy, empezar desde ayer
    if (!sortedDates.includes(today)) {
        expectedDate.setDate(expectedDate.getDate() - 1);
    }
    
    // Contar días consecutivos hacia atrás
    for (let dateStr of sortedDates) {
        const expectedDateStr = expectedDate.toISOString().split('T')[0];
        
        if (dateStr === expectedDateStr) {
            streak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
        } else if (dateStr < expectedDateStr) {
            // Hay un gap, terminar la racha
            break;
        }
        // Si dateStr > expectedDateStr, continuar buscando
    }
    
    return streak;
}

// Obtener racha actual del usuario
function getCurrentStreak(user) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let todayCompletions = 0;
    let yesterdayCompletions = 0;
    
    Object.values(user.habits).forEach(habit => {
        if (habit.completions.includes(today)) todayCompletions++;
        if (habit.completions.includes(yesterdayStr)) yesterdayCompletions++;
    });
    
    return todayCompletions > 0 ? Math.max(todayCompletions, yesterdayCompletions) : 0;
}

// Generar análisis detallado (optimizado)
function generateAnalytics(user) {
    const habits = Object.values(user.habits);
    const totalHabits = habits.length;
    const totalCompletions = user.stats.totalCompletions;
    
    // Si no hay hábitos, devolver datos básicos
    if (totalHabits === 0) {
        return {
            summary: {
                totalHabits: 0,
                totalCompletions: 0,
                currentStreak: 0,
                longestStreak: 0,
                completionRate: 0
            },
            categoryStats: {},
            topHabits: [],
            weeklyProgress: []
        };
    }
    
    // Análisis por categoría (optimizado)
    const categoryStats = {};
    let maxStreak = 0;
    
    habits.forEach(habit => {
        // Categorías
        const cat = habit.category || 'General';
        if (!categoryStats[cat]) {
            categoryStats[cat] = { count: 0, completions: 0 };
        }
        categoryStats[cat].count++;
        categoryStats[cat].completions += habit.completions.length;
        
        // Encontrar racha máxima
        if (habit.streak > maxStreak) {
            maxStreak = habit.streak;
        }
    });
    
    // Top 3 hábitos (solo si hay más de 3)
    const topHabits = habits.length > 0 ? 
        habits
            .map(h => ({ name: h.name, streak: h.streak, completions: h.completions.length }))
            .sort((a, b) => b.streak - a.streak)
            .slice(0, Math.min(3, habits.length)) : [];
    
    // Progreso semanal simplificado
    const weeklyProgress = getWeeklyProgressOptimized(habits);
    
    return {
        summary: {
            totalHabits,
            totalCompletions,
            currentStreak: user.stats.currentStreak,
            longestStreak: user.stats.longestStreak,
            completionRate: totalHabits > 0 ? Math.round((totalCompletions / (totalHabits * 7)) * 100) : 0
        },
        categoryStats,
        topHabits,
        weeklyProgress
    };
}

// Obtener progreso de la última semana (optimizado)
function getWeeklyProgressOptimized(habits) {
    if (habits.length === 0) return [];
    
    const days = [];
    const today = new Date();
    
    // Pre-calcular todas las fechas de la semana
    const weekDates = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        weekDates.push(date.toISOString().split('T')[0]);
    }
    
    // Crear un mapa de completions por fecha para búsqueda rápida
    const completionsByDate = new Map();
    habits.forEach(habit => {
        habit.completions.forEach(completion => {
            if (weekDates.includes(completion)) {
                completionsByDate.set(completion, (completionsByDate.get(completion) || 0) + 1);
            }
        });
    });
    
    // Construir resultado
    weekDates.forEach((dateStr, index) => {
        const date = new Date(dateStr);
        days.push({
            date: dateStr,
            completions: completionsByDate.get(dateStr) || 0,
            dayName: date.toLocaleDateString('es-ES', { weekday: 'short' })
        });
    });
    
    return days;
}

// Mantener función original para compatibilidad
function getWeeklyProgress(habits) {
    return getWeeklyProgressOptimized(habits);
}

app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 Habit Tracker listo para usar`);
    console.log(`💾 Datos cargados: ${Object.keys(users).length} usuarios`);
});