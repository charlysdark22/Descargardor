# Descargardor 
Visuales UCLV Desktop

Una aplicación de escritorio moderna para navegar y descargar contenido de visuales.uclv.cu - el repositorio audiovisual de la Universidad Central Marta Abreu de Las Villas.



✨ Características





🎬 Exploración de contenido - Navega por películas, series, documentales, cursos y más



📁 Estructura por categorías - Organización clara del contenido disponible



⬇️ Sistema de descargas - Descarga archivos individuales o carpetas completas



❤️ Favoritos - Guarda tus contenidos favoritos para acceso rápido



🔍 Búsqueda - Encuentra contenido rápidamente en todas las categorías



📜 Historial - Registro de tu actividad de navegación



🎨 Interfaz moderna - Diseño oscuro y intuitivo

📂 Categorías Disponibles





🎬 Películas -ovies.uclv.cu)



📺 Series (series.uclv.cu)



🎥 Documentales



🆕 Recientes



📚 Cursos



🎤 Conferencias

🚀 Instalación

Requisitos Previos





Node.js 16.x o superior



Git

Pasos de Instalación





Clonar el repositorio

git clone https://github.com/tu-usuario/visuales-uclv-app.git
cd visuales-uclv-app






Instalar dependencias

npm install






Ejecutar la aplicación

npm start


Construcción para Producción

# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux


Los ejecutables se generarán en la carpeta dist/.

🛠️ Desarrollo

Estructura del Proyecto

visuales-uclv-app/
├── main.js              # Proceso principal de Electron
├── preload.js           # Puente seguro entre Node y Renderer
├── index.html           # Interfaz de usuario principal
├── styles.css           # Estilos de la aplicación
├── app.js               # Lógica de la aplicación
├── package.json         # Configuración del proyecto
├── assets/              # Recursos estáticos
│   └── icon.ico         # Icono de la aplicación
└── dist/                # Archivos compilados (generado)


Tecnologías Utilizadas





Electron - Framework de aplicación de escritorio



Cheerio - Parser HTML para scraping



Axios - Cliente HTTP para descargas



HTML5/CSS3 - Interfaz moderna

📝 Uso





Explorar categorías - Haz clic en una categoría del panel lateral



Navegar carpetas - Haz doble clic para entrar en carpetas



Ver detalles - Haz clic simple en un archivo/carpeta



Descargar - Usa el botón de descarga en los detalles



Buscar - Usa la barra de búsqueda superior

⚠️ Notas





El sitio visuales.uclv.cu es un servidor Apache con índice público



Necesitas conexión a internet para acceder al contenido



Desde fuera de Cuba, puede requerir VPN con IP cubana



Algunas velocidades de descarga pueden variar

📄 Licencia

MIT License -feel free to use and modify.

🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request.



Desarrollado con ❤️ para la comunidad cubana
