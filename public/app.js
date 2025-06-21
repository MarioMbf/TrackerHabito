// Variables globales
let currentUser = null;
let userHabits = {};
let analytics = {};

// Elementos del DOM
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const userIdInput = document.getElementById('user-id-input');
const loginBtn = document.getElementById('login-btn');
const createUserBtn = document.getElementById('create-user-btn');
const logoutBtn = document.getElementById('logout-btn');
const userIdDisplay = document.getElementById('user-id-display');
const userIdModal = document.getElementById('user-id-modal');
const newUserIdSpan = document.getElementById('new-user-id');
const copyIdBtn = document.getElementById('copy-id-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

// Elementos del formulario de hábitos
const habitNameInput = document.getElementById('habit-name');
const habitDescriptionInput = document.getElementById('habit-description');
const habitCategorySelect = document.getElementById('habit-category');
const addHabitBtn = document.getElementById('add-habit-btn');
const habitsContainer = document.getElementById('habits-container');

// Elementos de estadísticas
const totalHabitsSpan = document.getElementById('total-habits');
const totalCompletionsSpan = document.getElementById('total-completions');
const currentStreakSpan = document.getElementById('current-streak');
const longestStreakSpan = document.getElementById('longest-streak');

// Elementos de análisis
const weeklyChart = document.getElementById('weekly-chart');
const topHabits = document.getElementById('top-habits');
const categoryStats = document.getElementById('category-stats');

// Event Listeners
loginBtn.addEventListener('click', handleLogin);
createUserBtn.addEventListener('click', handleCreateUser);
logoutBtn.addEventListener('click', handleLogout);
addHabitBtn.addEventListener('click', handleAddHabit);
copyIdBtn.addEventListener('click', handleCopyId);
closeModalBtn.addEventListener('click', closeModal);

// Prevenir envío del formulario de login
const loginForm = document.querySelector('.login-form form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });
}

// Prevenir envío del formulario de hábitos
const habitForm = document.querySelector('.habit-form');
if (habitForm) {
    habitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddHabit();
    });
}

// Permitir login con Enter
userIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleLogin();
    }
});

// Permitir agregar hábito con Enter
habitNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleAddHabit();
    }
});

// Funciones principales
async function handleLogin() {
    const userId = userIdInput.value.trim();
    
    if (!userId) {
        showNotification('Por favor, introduce un ID de usuario', 'error');
        return;
    }
    
    console.log('🔐 Intentando login con ID:', userId.substring(0, 8) + '...');
    
    try {
        const response = await fetch('/api/user/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });
        
        console.log('📡 Respuesta del servidor:', response.status);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Datos recibidos:', data.success ? 'Login exitoso' : 'Login fallido');
        
        if (data.success && data.user) {
            currentUser = data.user;
            console.log('👤 Usuario establecido:', currentUser.id);
            
            // Verificar que los elementos existen antes de usarlos
            if (userIdDisplay) {
                userIdDisplay.textContent = `ID: ${userId.substring(0, 8)}...`;
            }
            
            console.log('🔄 Cambiando a pantalla principal...');
            switchToMainScreen();
            
            console.log('📥 Cargando datos del usuario...');
            await loadUserData();
            
            showNotification('¡Bienvenido de vuelta!', 'success');
        } else {
            console.log('❌ Login fallido:', data.message || 'Usuario no encontrado');
            showNotification(data.message || 'ID de usuario no encontrado', 'error');
        }
    } catch (error) {
        console.error('💥 Error al iniciar sesión:', error);
        showNotification('Error de conexión. Verifica que el servidor esté funcionando.', 'error');
    }
}

async function handleCreateUser() {
    try {
        const response = await fetch('/api/user/create', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.userId) {
            newUserIdSpan.textContent = data.userId;
            showModal();
        }
    } catch (error) {
        console.error('Error al crear usuario:', error);
        showNotification('Error al crear usuario', 'error');
    }
}

function handleLogout() {
    currentUser = null;
    userHabits = {};
    analytics = {};
    userIdInput.value = '';
    switchToLoginScreen();
    showNotification('Sesión cerrada', 'info');
}

async function handleAddHabit() {
    const name = habitNameInput.value.trim();
    const description = habitDescriptionInput.value.trim();
    const category = habitCategorySelect.value;
    
    if (!name) {
        showNotification('El nombre del hábito es obligatorio', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/habits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                habitName: name,
                description,
                category
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            habitNameInput.value = '';
            habitDescriptionInput.value = '';
            await loadUserData();
            showNotification('Hábito agregado exitosamente', 'success');
        }
    } catch (error) {
        console.error('Error al agregar hábito:', error);
        showNotification('Error al agregar hábito', 'error');
    }
}

async function handleCompleteHabit(habitId) {
    try {
        const response = await fetch('/api/habits/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                habitId,
                date: new Date().toISOString().split('T')[0]
            })
        });
        
        if (response.ok) {
            await loadUserData();
            showNotification('¡Hábito completado!', 'success');
        }
    } catch (error) {
        console.error('Error al completar hábito:', error);
        showNotification('Error al completar hábito', 'error');
    }
}

function handleCopyId() {
    const userId = newUserIdSpan.textContent;
    navigator.clipboard.writeText(userId).then(() => {
        showNotification('ID copiado al portapapeles', 'success');
    }).catch(() => {
        showNotification('Error al copiar ID', 'error');
    });
}

// Funciones de UI
function switchToMainScreen() {
    console.log('🖥️ Cambiando a pantalla principal...');
    
    // Verificar que los elementos existen
    if (!loginScreen || !mainScreen) {
        console.error('❌ Error: Elementos de pantalla no encontrados');
        console.log('loginScreen:', loginScreen);
        console.log('mainScreen:', mainScreen);
        return;
    }
    
    try {
        loginScreen.classList.remove('active');
        mainScreen.classList.add('active');
        console.log('✅ Cambio a pantalla principal completado');
        
        // Verificar que el cambio fue exitoso
        setTimeout(() => {
            const loginVisible = loginScreen.classList.contains('active');
            const mainVisible = mainScreen.classList.contains('active');
            console.log('🔍 Estado de pantallas - Login:', loginVisible, 'Main:', mainVisible);
        }, 100);
        
    } catch (error) {
        console.error('💥 Error al cambiar pantalla:', error);
    }
}

function switchToLoginScreen() {
    console.log('🔙 Cambiando a pantalla de login...');
    
    // Verificar que los elementos existen
    if (!loginScreen || !mainScreen) {
        console.error('❌ Error: Elementos de pantalla no encontrados');
        return;
    }
    
    try {
        mainScreen.classList.remove('active');
        loginScreen.classList.add('active');
        console.log('✅ Cambio a pantalla de login completado');
    } catch (error) {
        console.error('💥 Error al cambiar pantalla:', error);
    }
}

function showModal() {
    userIdModal.classList.add('active');
}

function closeModal() {
    userIdModal.classList.remove('active');
}

// Funciones de datos (optimizado)
async function loadUserData() {
    try {
        // Mostrar indicador de carga
        showLoadingIndicator(true);
        
        // Cargar datos en paralelo para mayor velocidad
        const [userResponse, analyticsResponse] = await Promise.all([
            fetch(`/api/user/${currentUser.id}`),
            fetch(`/api/analytics/${currentUser.id}`)
        ]);
        
        if (!userResponse.ok || !analyticsResponse.ok) {
            throw new Error('Error en la respuesta del servidor');
        }
        
        const [userData, analyticsData] = await Promise.all([
            userResponse.json(),
            analyticsResponse.json()
        ]);
        
        // Actualizar datos
        currentUser = userData;
        userHabits = userData.habits || {};
        analytics = analyticsData;
        
        // Actualizar UI de forma eficiente
        updateStats();
        renderHabits();
        renderAnalytics();
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
        showNotification('Error al cargar datos. Intenta de nuevo.', 'error');
    } finally {
        // Ocultar indicador de carga
        showLoadingIndicator(false);
    }
}

// Función para mostrar/ocultar indicador de carga
function showLoadingIndicator(show) {
    let loader = document.getElementById('loading-indicator');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loading-indicator';
            loader.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Cargando datos...</span>
                </div>
            `;
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                color: white;
                font-size: 1.2rem;
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    } else if (loader) {
        loader.style.display = 'none';
    }
}

function updateStats() {
    if (analytics.summary) {
        totalHabitsSpan.textContent = analytics.summary.totalHabits;
        totalCompletionsSpan.textContent = analytics.summary.totalCompletions;
        currentStreakSpan.textContent = analytics.summary.currentStreak;
        longestStreakSpan.textContent = analytics.summary.longestStreak;
    }
}

function renderHabits() {
    habitsContainer.innerHTML = '';
    
    const habitEntries = Object.entries(userHabits);
    
    if (habitEntries.length === 0) {
        habitsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-plus-circle" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                <p>No tienes hábitos aún. ¡Agrega tu primer hábito arriba!</p>
            </div>
        `;
        return;
    }
    
    habitEntries.forEach(([habitId, habit]) => {
        const today = new Date().toISOString().split('T')[0];
        const isCompletedToday = habit.completions.includes(today);
        
        const habitCard = document.createElement('div');
        habitCard.className = 'habit-card';
        habitCard.innerHTML = `
            <div class="habit-header">
                <div class="habit-name">${habit.name}</div>
                <div class="habit-category">${habit.category}</div>
            </div>
            ${habit.description ? `<div class="habit-description">${habit.description}</div>` : ''}
            <div class="habit-stats">
                <div class="habit-streak">
                    <i class="fas fa-fire"></i>
                    <span>${habit.streak} días</span>
                </div>
                <div class="habit-completions">
                    ${habit.completions.length} completados
                </div>
            </div>
            <button class="complete-btn ${isCompletedToday ? 'completed' : ''}" 
                    onclick="handleCompleteHabit('${habitId}')"
                    ${isCompletedToday ? 'disabled' : ''}>
                <i class="fas ${isCompletedToday ? 'fa-check' : 'fa-plus'}"></i>
                ${isCompletedToday ? 'Completado hoy' : 'Marcar como completado'}
            </button>
        `;
        
        habitsContainer.appendChild(habitCard);
    });
}

function renderAnalytics() {
    if (!analytics.weeklyProgress) return;
    
    // Renderizar gráfico semanal
    renderWeeklyChart();
    
    // Renderizar mejores hábitos
    renderTopHabits();
    
    // Renderizar estadísticas por categoría
    renderCategoryStats();
}

function renderWeeklyChart() {
    weeklyChart.innerHTML = '';
    
    const maxCompletions = Math.max(...analytics.weeklyProgress.map(day => day.completions), 1);
    
    analytics.weeklyProgress.forEach(day => {
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        const height = (day.completions / maxCompletions) * 100;
        bar.style.height = `${Math.max(height, 4)}%`;
        bar.innerHTML = `<div class="chart-label">${day.dayName}</div>`;
        bar.title = `${day.dayName}: ${day.completions} completados`;
        weeklyChart.appendChild(bar);
    });
}

function renderTopHabits() {
    topHabits.innerHTML = '';
    
    if (!analytics.topHabits || analytics.topHabits.length === 0) {
        topHabits.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No hay datos suficientes</p>';
        return;
    }
    
    analytics.topHabits.forEach(habit => {
        const item = document.createElement('div');
        item.className = 'top-habit-item';
        item.innerHTML = `
            <div class="top-habit-name">${habit.name}</div>
            <div class="top-habit-streak">
                <i class="fas fa-fire"></i>
                ${habit.streak}
            </div>
        `;
        topHabits.appendChild(item);
    });
}

function renderCategoryStats() {
    categoryStats.innerHTML = '';
    
    if (!analytics.categoryStats) {
        categoryStats.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No hay datos suficientes</p>';
        return;
    }
    
    Object.entries(analytics.categoryStats).forEach(([category, stats]) => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `
            <div>
                <strong>${category}</strong>
                <div style="font-size: 0.9rem; color: var(--text-secondary);">
                    ${stats.count} hábito${stats.count !== 1 ? 's' : ''}
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 600; color: var(--accent-success);">
                    ${stats.completions}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                    completados
                </div>
            </div>
        `;
        categoryStats.appendChild(item);
    });
}

// Sistema de notificaciones
function showNotification(message, type = 'info') {
    // Remover notificación existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Estilos para la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow-lg);
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    
    const content = notification.querySelector('.notification-content');
    content.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;
    
    const icon = notification.querySelector('i');
    icon.style.color = getNotificationColor(type);
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 3 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: 'var(--accent-success)',
        error: 'var(--accent-danger)',
        warning: 'var(--accent-warning)',
        info: 'var(--accent-primary)'
    };
    return colors[type] || colors.info;
}

// Agregar estilos de animación para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Habit Tracker iniciado');
    
    // Verificar que todos los elementos críticos existen
    const criticalElements = {
        loginScreen: 'login-screen',
        mainScreen: 'main-screen',
        userIdInput: 'user-id-input',
        loginBtn: 'login-btn',
        createUserBtn: 'create-user-btn',
        logoutBtn: 'logout-btn',
        userIdDisplay: 'user-id-display'
    };
    
    let allElementsFound = true;
    
    for (const [varName, elementId] of Object.entries(criticalElements)) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`❌ Elemento crítico no encontrado: ${elementId}`);
            allElementsFound = false;
        } else {
            console.log(`✅ Elemento encontrado: ${elementId}`);
        }
    }
    
    if (allElementsFound) {
        console.log('✅ Todos los elementos críticos encontrados');
        console.log('🔍 Estado inicial de pantallas:');
        console.log('- Login screen active:', loginScreen?.classList.contains('active'));
        console.log('- Main screen active:', mainScreen?.classList.contains('active'));
    } else {
        console.error('❌ Faltan elementos críticos. La aplicación puede no funcionar correctamente.');
    }
});