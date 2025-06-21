# Habit Tracker

Aplicación web para seguimiento de hábitos con análisis de datos, estadísticas detalladas y diseño oscuro moderno.

## Características

- 📊 Seguimiento de hábitos diarios
- 📈 Estadísticas y análisis detallados
- 🌙 Diseño oscuro moderno
- 📱 Interfaz responsive
- 💾 Persistencia de datos local

## Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/MarioMbf/TrackerHabito.git
cd TrackerHabito
```

2. Instala las dependencias:
```bash
npm install
```

3. Inicia el servidor:
```bash
npm start
```

4. Abre tu navegador en `http://localhost:3000`

## Uso

1. Crea un usuario o inicia sesión con un ID existente
2. Añade nuevos hábitos que quieras seguir
3. Marca los hábitos como completados diariamente
4. Revisa tus estadísticas y progreso

## Tecnologías

- **Backend**: Node.js, Express
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Almacenamiento**: JSON local
- **Dependencias**: UUID para generación de IDs, CORS para manejo de peticiones

## Estructura del Proyecto

```
TrackerHabito/
├── src/
│   └── server.js          # Servidor Express
├── public/
│   ├── index.html         # Página principal
│   ├── app.js            # Lógica del frontend
│   ├── styles.css        # Estilos CSS
│   ├── robots.txt        # Configuración para bots
│   ├── sitemap.xml       # Mapa del sitio
│   └── site.webmanifest  # Manifiesto PWA
├── data.json             # Base de datos local
└── package.json          # Configuración del proyecto
```

## Licencia

MIT