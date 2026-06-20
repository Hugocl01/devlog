// ═══════════════════════════════════════════════════════════════
// SEED DE BASE DE DATOS — SOLO PARA DESARROLLO / PRIMERA INSTALACIÓN
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────

function readContent(type: "posts" | "updates", filename: string): string {
  const raw = readFileSync(join(process.cwd(), `src/content/${type}/${filename}`), "utf-8");
  return raw.replace(/^---[\s\S]*?---\n/, "").trim();
}

function estimateReadingTime(content: string): number {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200));
}

// ─────────────────────────────────────────────
// DATOS BASE
// ─────────────────────────────────────────────

const roles = [
  { id: 1, name: "USER",  description: "Usuario registrado con acceso a comentarios y reacciones" },
  { id: 2, name: "ADMIN", description: "Administrador con acceso al panel de gestión" },
];

const reactionTypes = [
  { name: "LIKE",   emoji: "👍", label: "Me gusta"       },
  { name: "LOVE",   emoji: "❤️", label: "Me encanta"     },
  { name: "FIRE",   emoji: "🔥", label: "En llamas"      },
  { name: "CLAP",   emoji: "👏", label: "Aplausos"       },
  { name: "WOW",    emoji: "😮", label: "Increíble"      },
  { name: "THINK",  emoji: "🤔", label: "Me hace pensar" },
  { name: "ROCKET", emoji: "🚀", label: "¡Al infinito!"  },
  { name: "BULB",   emoji: "💡", label: "Revelador"      },
  { name: "LAUGH",  emoji: "😂", label: "Me divierte"    },
  { name: "TROPHY", emoji: "🏆", label: "Destacado"      },
];

const updateTypes = [
  { name: "feature",     label: "Nueva función",       color: "#22c55e" },
  { name: "bugfix",      label: "Corrección de error", color: "#ef4444" },
  { name: "improvement", label: "Mejora",               color: "#3b82f6" },
  { name: "general",     label: "General",              color: "#6b7280" },
];

const tags = [
  // ── Lenguajes ─────────────────────────────────────────────────────────────
  { name: "JavaScript",              slug: "javascript",              color: "#f7df1e" }, // JS yellow
  { name: "TypeScript",              slug: "typescript",              color: "#3178c6" }, // TS blue
  { name: "PHP",                     slug: "php",                     color: "#8892bf" }, // PHP logo purple-blue
  { name: "CSS",                     slug: "css",                     color: "#264de4" }, // CSS3 blue
  { name: "Swift",                   slug: "swift",                   color: "#f05138" }, // Swift orange-red
  // ── Herramientas / Runtimes ───────────────────────────────────────────────
  { name: "Git",                     slug: "git",                     color: "#f05032" }, // Git red-orange
  { name: "Node.js",                 slug: "nodejs",                  color: "#339933" }, // Node green
  { name: "Docker",                  slug: "docker",                  color: "#2496ed" }, // Docker blue
  { name: "Bun",                     slug: "bun",                     color: "#c8a97e" }, // Bun tan/cream visible
  { name: "Composer",                slug: "composer",                color: "#885630" }, // Composer brown
  // ── Frameworks / Librerías ───────────────────────────────────────────────
  { name: "Astro",                   slug: "astro",                   color: "#ff5d01" }, // Astro orange
  { name: "React",                   slug: "react",                   color: "#61dafb" }, // React cyan
  { name: "SwiftUI",                 slug: "swiftui",                 color: "#0070c9" }, // Apple dev blue
  // ── Servicios / Plataformas ──────────────────────────────────────────────
  { name: "Cloudflare",              slug: "cloudflare",              color: "#f38020" }, // Cloudflare orange
  { name: "Obsidian",                slug: "obsidian",                color: "#7c3aed" }, // Obsidian purple
  { name: "RSS",                     slug: "rss",                     color: "#fe6600" }, // RSS universal orange
  // ── Ecosistema Apple ──────────────────────────────────────────────────────
  { name: "iOS",                     slug: "ios",                     color: "#007aff" }, // iOS accent blue
  { name: "macOS",                   slug: "macos",                   color: "#a2aaad" }, // Apple silver
  { name: "Apple",                   slug: "apple",                   color: "#555555" }, // Apple logo gray
  // ── Dominios técnicos con color representativo ───────────────────────────
  { name: "Desarrollo web",          slug: "desarrollo-web",          color: "#e34f26" }, // HTML5 orange
  { name: "Frontend",                slug: "frontend",                color: "#06b6d4" }, // cyan
  { name: "Backend",                 slug: "backend",                 color: "#6366f1" }, // indigo
  { name: "DevOps",                  slug: "devops",                  color: "#f59e0b" }, // amber
  { name: "DevSecOps",               slug: "devsecops",               color: "#2563eb" }, // blue
  { name: "Seguridad",               slug: "seguridad",               color: "#dc2626" }, // red-600
  { name: "Ciberseguridad",          slug: "ciberseguridad",          color: "#ef4444" }, // red-500
  { name: "IA",                      slug: "ia",                      color: "#10b981" }, // emerald
  { name: "Inteligencia artificial", slug: "inteligencia-artificial", color: "#10b981" }, // emerald
  { name: "Diseño web",              slug: "diseno-web",              color: "#ec4899" }, // pink
  { name: "Menta",                   slug: "menta",                   color: "#3eb489" }, // mint green
  // ── Sin color de marca reconocible ───────────────────────────────────────
  { name: "Tecnología",              slug: "tecnologia",              color: null },
  { name: "Proyectos",               slug: "proyectos",               color: null },
  { name: "Junior",                  slug: "junior",                  color: null },
  { name: "Experiencia",             slug: "experiencia",             color: null },
  { name: "Crecimiento",             slug: "crecimiento",             color: null },
  { name: "Historia",                slug: "historia",                color: null },
  { name: "JSON",                    slug: "json",                    color: null },
  { name: "TOON",                    slug: "toon",                    color: null },
  { name: "LLMs",                    slug: "llms",                    color: null },
  { name: "XML",                     slug: "xml",                     color: null },
  { name: "Aprendizaje",             slug: "aprendizaje",             color: null },
  { name: "Productividad",           slug: "productividad",           color: null },
  { name: "Estudio",                 slug: "estudio",                 color: null },
  { name: "Herramientas",            slug: "herramientas",            color: null },
  { name: "Software",                slug: "software",                color: null },
  { name: "Versionado",              slug: "versionado",              color: null },
  { name: "Buenas prácticas",        slug: "buenas-practicas",        color: null },
  { name: "Mantenimiento",           slug: "mantenimiento",           color: null },
  { name: "Frameworks",              slug: "frameworks",              color: null },
  { name: "Edge computing",          slug: "edge-computing",          color: null },
  { name: "Programación",            slug: "programacion",            color: null },
  { name: "Lenguajes de programación", slug: "lenguajes-de-programacion", color: null },
  { name: "TIOBE Index",             slug: "tiobe-index",             color: null },
  { name: "Desarrollo de software",  slug: "desarrollo-de-software",  color: null },
  { name: "Contenedores",            slug: "contenedores",            color: null },
  { name: "Infraestructura",         slug: "infraestructura",         color: null },
  { name: "UI/UX",                   slug: "ui-ux",                   color: null },
  { name: "Buscador",                slug: "buscador",                color: null },
  { name: "Diseño",                  slug: "diseno",                  color: null },
  { name: "Actualizaciones",         slug: "actualizaciones",         color: null },
  { name: "Rendimiento",             slug: "rendimiento",             color: null },
  { name: "Depuración",              slug: "depuracion",              color: null },
  { name: "Workflow",                slug: "workflow",                color: null },
  { name: "Desarrollo",              slug: "desarrollo",              color: null },
  { name: "Carrera",                 slug: "carrera",                 color: null },
  { name: "Reflexión",               slug: "reflexion",               color: null },
];

// ─────────────────────────────────────────────
// USUARIOS
// ─────────────────────────────────────────────

// ⚠️  Contraseña pública de demo — cambiar en producción tras el primer login
const PASSWORD = "DevLog2025!";

const usersData = [
  { name: "Hugo Cayón Laso",  email: "hugocayon@gmail.com",          roleId: 2, emailVerified: true,  bio: "Desarrollador web y creador de DevLog. Apasionado por el código limpio y las tecnologías modernas." },
  { name: "María García",     email: "maria.garcia@email.com",        roleId: 1, emailVerified: true,  bio: "Frontend developer con 3 años de experiencia. Entusiasta de React y el diseño accesible." },
  { name: "Carlos López",     email: "carlos.lopez@email.com",        roleId: 1, emailVerified: true,  bio: null },
  { name: "Ana Martínez",     email: "ana.martinez@email.com",        roleId: 1, emailVerified: true,  bio: "Estudiante de ingeniería informática. Me encanta aprender sobre desarrollo web y ciberseguridad." },
  { name: "David Fernández",  email: "david.fernandez@email.com",     roleId: 1, emailVerified: true,  bio: null },
  { name: "Laura Rodríguez",  email: "laura.rodriguez@email.com",     roleId: 1, emailVerified: true,  bio: "Diseñadora UX que está aprendiendo a programar. TypeScript me ha cambiado la vida." },
  { name: "Javier Sánchez",   email: "javier.sanchez@email.com",      roleId: 1, emailVerified: true,  bio: null },
  { name: "Elena González",   email: "elena.gonzalez@email.com",      roleId: 1, emailVerified: true,  bio: "Desarrolladora fullstack. Node.js y PostgreSQL son mis herramientas del día a día." },
  { name: "Pablo Díaz",       email: "pablo.diaz@email.com",          roleId: 1, emailVerified: false, bio: null },
  { name: "Isabel Moreno",    email: "isabel.moreno@email.com",       roleId: 1, emailVerified: false, bio: null },
];

// ─────────────────────────────────────────────
// POSTS
// ─────────────────────────────────────────────

const postsData = [
  {
    slug: "bienvenido-a-mi-blog",
    file: "post-000001.md",
    title: "Bienvenido a mi blog",
    description: "Un espacio donde comparto mis experiencias como desarrollador web, mis proyectos personales y curiosidades sobre tecnología.",
    publishedAt: new Date("2025-11-13"),
    draft: false,
    tags: ["desarrollo-web", "tecnologia", "proyectos"],
  },
  {
    slug: "de-la-teoria-a-la-practica-junior",
    file: "post-000002.md",
    title: "De la Teoría a la Práctica: Mis 4 Meses Como Junior",
    description: "Un relato honesto sobre lo que realmente significa empezar en el mundo profesional del desarrollo web: dudas, logros, aprendizajes y crecimiento.",
    publishedAt: new Date("2025-11-15"),
    draft: false,
    tags: ["desarrollo-web", "junior", "experiencia", "crecimiento"],
  },
  {
    slug: "json-y-toon-soluciones-de-su-epoca",
    file: "post-000003.md",
    title: "La Razón de Ser de JSON y TOON: Soluciones a Problemas de Época",
    description: "Descubre por qué JSON reemplazó a XML y por qué el nuevo formato TOON está desafiando a JSON en el mundo de la Inteligencia Artificial.",
    publishedAt: new Date("2025-11-30"),
    draft: false,
    tags: ["historia", "json", "toon", "ia", "inteligencia-artificial", "llms", "xml"],
  },
  {
    slug: "como-organizo-mi-aprendizaje",
    file: "post-000004.md",
    title: "Cómo organizo mi aprendizaje como desarrollador web",
    description: "Mi sistema personal para aprender nuevas tecnologías de forma constante, sin perder el rumbo ni la motivación.",
    publishedAt: new Date("2025-12-01"),
    draft: false,
    tags: ["aprendizaje", "desarrollo-web", "productividad", "estudio", "crecimiento"],
  },
  {
    slug: "mi-configuracion-para-desarrollar",
    file: "post-000005.md",
    title: "Mi configuración para desarrollar aplicaciones",
    description: "Así es el entorno que utilizo para desarrollar aplicaciones web: hardware, software, extensiones, herramientas y ajustes de productividad.",
    publishedAt: new Date("2025-12-07"),
    draft: false,
    tags: ["desarrollo-web", "herramientas", "productividad", "software"],
  },
  {
    slug: "git-desde-cero-guia-basica",
    file: "post-000006.md",
    title: "Git desde cero: guía básica de control de versiones para desarrolladores",
    description: "Aprende Git desde cero: qué es, para qué sirve y cómo usar los comandos básicos para gestionar versiones de tu código.",
    publishedAt: new Date("2025-12-16"),
    draft: false,
    tags: ["git", "versionado", "buenas-practicas", "devops", "mantenimiento"],
  },
  {
    slug: "composer-en-php-guia-completa",
    file: "post-000007.md",
    title: "Composer en PHP: guía completa para empezar",
    description: "Aprende qué es Composer, cómo instalarlo y cómo gestionar dependencias en proyectos PHP de forma profesional.",
    publishedAt: new Date("2026-01-11"),
    draft: false,
    tags: ["php", "composer", "backend"],
  },
  {
    slug: "ahora-tenemos-rss",
    file: "post-000008.md",
    title: "Ahora tenemos RSS: qué es, cómo funciona y por qué te interesa",
    description: "Te explico qué es un RSS feed, cómo funciona y por qué deberías suscribirte al feed de este blog para no perderte nada.",
    publishedAt: new Date("2026-01-16"),
    draft: false,
    tags: ["rss", "xml", "tecnologia"],
  },
  {
    slug: "cloudflare-adquiere-equipo-astro",
    file: "post-000009.md",
    title: "Cloudflare adquiere al equipo de Astro: qué significa para el desarrollo web",
    description: "Analizo la reciente compra del equipo de Astro por Cloudflare y por qué puede ser un punto de inflexión en frameworks web y edge computing en 2026.",
    publishedAt: new Date("2026-01-22"),
    draft: false,
    tags: ["astro", "cloudflare", "frameworks", "desarrollo-web"],
  },
  {
    slug: "tendencias-tecnologicas-2026",
    file: "post-000010.md",
    title: "Las principales tendencias tecnológicas que están marcando 2026 en desarrollo web",
    description: "Un análisis de las tendencias tecnológicas actuales que están transformando el desarrollo web en 2026 y qué deberías dominar como desarrollador.",
    publishedAt: new Date("2026-01-23"),
    draft: false,
    tags: ["desarrollo-web", "ia", "inteligencia-artificial", "productividad", "edge-computing"],
  },
  {
    slug: "ia-en-el-flujo-de-desarrollo",
    file: "post-000011.md",
    title: "La IA en el flujo de desarrollo: ¿herramienta imprescindible o fuente de incertidumbre?",
    description: "Analizo cómo la inteligencia artificial está transformando el proceso de desarrollo de software en 2026, sus beneficios, riesgos y cómo puedes sacar provecho sin perder calidad.",
    publishedAt: new Date("2026-01-31"),
    draft: false,
    tags: ["ia", "desarrollo-web", "productividad", "herramientas"],
  },
  {
    slug: "mi-sistema-de-apuntes",
    file: "post-000012.md",
    title: "Mi sistema de apuntes como desarrollador",
    description: "Cómo organizo mis apuntes técnicos combinando papel y Obsidian para aprender mejor, recordar más y tomar mejores decisiones como desarrollador.",
    publishedAt: new Date("2026-02-06"),
    draft: false,
    tags: ["obsidian", "aprendizaje", "desarrollo-web", "productividad"],
  },
  {
    slug: "tendencias-lenguajes-programacion-2026",
    file: "post-000013.md",
    title: "Tendencias de lenguajes de programación en 2026: qué está subiendo, por qué y dónde se usan",
    description: "Análisis actualizado de los 15 lenguajes de programación más populares según el índice TIOBE de febrero de 2026, con sectores y usos comunes.",
    publishedAt: new Date("2026-02-14"),
    draft: false,
    tags: ["programacion", "lenguajes-de-programacion", "tiobe-index", "desarrollo-de-software"],
  },
  {
    slug: "que-es-docker-y-por-que-aprenderlo",
    file: "post-000014.md",
    title: "¿Qué es Docker y por qué todo desarrollador debería entenderlo?",
    description: "Descubre qué es Docker, cómo funcionan los contenedores y por qué entender esta tecnología es fundamental para cualquier desarrollador moderno.",
    publishedAt: new Date("2026-03-08"),
    draft: false,
    tags: ["docker", "devops", "backend", "contenedores", "infraestructura"],
  },
  {
    slug: "como-construi-mi-blog-con-astro",
    file: "post-000015.md",
    title: "Cómo construí mi blog con Astro: arquitectura, componentes y trucos",
    description: "Explicación técnica y ejemplos de código de mi blog en Astro.",
    publishedAt: new Date("2026-03-09"),
    draft: false,
    tags: ["astro", "proyectos", "desarrollo-web"],
  },
  {
    slug: "buscador-inteligente-estetica-renovada",
    file: "post-000016.md",
    title: "Buscador inteligente y estética renovada: La nueva experiencia DevLog",
    description: "Nuevo buscador instantáneo con Pagefind y la evolución de nuestra identidad visual hacia un sistema más táctil, fluido y coherente.",
    publishedAt: new Date("2026-04-18"),
    draft: false,
    tags: ["astro", "ui-ux", "buscador", "diseno", "actualizaciones"],
  },
  {
    slug: "primer-experimento-app-ios-macos",
    file: "post-000017.md",
    title: "Mi primer experimento creando una app para iOS y macOS",
    description: "Empiezo un pequeño proyecto personal para aprender Swift y desarrollar una aplicación de tareas sencilla para el ecosistema Apple.",
    publishedAt: new Date("2026-05-07"),
    draft: false,
    tags: ["swift", "swiftui", "ios", "macos", "apple", "aprendizaje"],
  },
  {
    slug: "css-grid-vs-flexbox",
    file: "post-000018.md",
    title: "CSS Grid vs Flexbox: cuándo usar cada uno de verdad",
    description: "No es uno mejor que el otro. Grid y Flexbox resuelven problemas distintos. En este artículo aprenderás a identificar cuándo usar cada uno y por qué la respuesta casi nunca es 'siempre Flexbox'.",
    publishedAt: new Date("2026-05-18"),
    draft: false,
    tags: ["css", "frontend", "diseno-web", "desarrollo-web"],
  },
  {
    slug: "variables-de-entorno-y-secretos",
    file: "post-000020.md",
    title: "Variables de entorno y secretos: cómo gestionar la configuración de tus proyectos",
    description: "Las variables de entorno no son solo para ocultar contraseñas. Son la forma correcta de separar configuración de código. Aprende a usarlas bien y a no cometer los errores más comunes.",
    publishedAt: new Date("2026-05-18"),
    draft: false,
    tags: ["seguridad", "backend", "buenas-practicas", "desarrollo-web", "devops"],
  },
  {
    slug: "browser-devtools-a-fondo",
    file: "post-000021.md",
    title: "Browser DevTools a fondo: la herramienta que tienes abierta y no aprovechas",
    description: "Las DevTools del navegador son mucho más que un inspector de elementos. Aprende a usar los paneles de red, rendimiento, memoria y aplicación para depurar como un profesional.",
    publishedAt: new Date("2026-05-18"),
    draft: false,
    tags: ["herramientas", "frontend", "desarrollo-web", "rendimiento", "depuracion"],
  },
  {
    slug: "bun-runtime-javascript",
    file: "post-000022.md",
    title: "Bun: el runtime JavaScript que quiere reemplazar a Node.js",
    description: "Bun no es solo un runtime más rápido. Es un intento de rediseñar el ecosistema JavaScript desde cero: runtime, gestor de paquetes, bundler y test runner en uno solo. ¿Merece la atención?",
    publishedAt: new Date("2026-05-18"),
    draft: false,
    tags: ["javascript", "bun", "nodejs", "herramientas", "backend", "rendimiento"],
  },
  {
    slug: "cookies-localstorage-sessionstorage",
    file: "post-000023.md",
    title: "Cookies, localStorage y sessionStorage: diferencias, usos y cuándo elegir cada uno",
    description: "Los tres sirven para guardar datos en el navegador, pero funcionan de forma muy distinta. Aprende las diferencias reales, los casos de uso de cada uno y los errores de seguridad más comunes.",
    publishedAt: new Date("2026-05-18"),
    draft: false,
    tags: ["javascript", "frontend", "seguridad", "desarrollo-web"],
  },
  {
    slug: "menta-gestor-de-tiempo",
    file: "post-000024.md",
    title: "Menta: Por qué creé mi propio gestor de tiempo para el trabajo",
    description: "Cansado de la fricción al registrar tiempos por tickets, decidí crear Menta: una solución rápida, centralizada y con estética minimalista.",
    publishedAt: new Date("2026-05-21"),
    draft: false,
    tags: ["productividad", "desarrollo", "herramientas", "workflow", "menta", "proyectos"],
  },
  {
    slug: "ciberseguridad-2026-amenazas",
    file: "post-000025.md",
    title: "Ciberseguridad en 2026: amenazas emergentes y qué deben saber los desarrolladores web",
    description: "Un análisis completo de las principales tendencias de ciberseguridad para 2026 y cómo los desarrolladores web pueden adaptarse a un panorama de ataques más sofisticados y defensas avanzadas.",
    publishedAt: new Date("2026-05-22"),
    draft: false,
    tags: ["ciberseguridad", "desarrollo-web", "seguridad", "devsecops", "ia"],
  },
  {
    slug: "un-ano-como-desarrollador-web",
    file: "post-000026.md",
    title: "Un año como desarrollador web: lo que nadie te cuenta",
    description: "El 28 de junio de 2025 firmé mi primer contrato como desarrollador web. Un año después, esto es lo que he aprendido, lo que me sorprendió y lo que le diría al Hugo que abrió esa puerta por primera vez.",
    publishedAt: new Date("2026-05-18"),
    draft: false,
    tags: ["carrera", "desarrollo", "reflexion", "junior", "aprendizaje"],
  },
];

// ─────────────────────────────────────────────
// UPDATES
// ─────────────────────────────────────────────

const updatesData = [
  {
    slug: "novedades-astro6-tailwind4",
    file: "update-00001.md",
    title: "Novedades en el blog: Astro 6, Tailwind 4 y mucho más",
    description: "Descubre las últimas actualizaciones del blog: migración a Astro 6, implementación de Tailwind CSS 4 y mejoras en la experiencia de usuario.",
    type: "improvement",
    publishedAt: new Date("2026-03-29"),
    draft: false,
  },
  {
    slug: "busqueda-instantanea-estetica-moderna",
    file: "update-00002.md",
    title: "Búsqueda Instantánea y Estética Moderna: El siguiente nivel de DevLog",
    description: "Cómo hemos transformado la búsqueda en DevLog utilizando Pagefind para obtener resultados instantáneos y una interfaz moderna y actual.",
    type: "feature",
    publishedAt: new Date("2026-04-18"),
    draft: false,
  },
  {
    slug: "tabla-de-contenidos-inteligente",
    file: "update-00003.md",
    title: "Tabla de Contenidos Inteligente en los Posts",
    description: "Los posts de DevLog estrenan una tabla de contenidos lateral que sigue tu posición en el artículo en tiempo real.",
    type: "feature",
    publishedAt: new Date("2026-04-19"),
    draft: false,
  },
  {
    slug: "nueva-seccion-posts-relacionados",
    file: "update-00004.md",
    title: "Nueva sección: Posts relacionados",
    description: "Al final de cada artículo aparece ahora una selección de posts con etiquetas en común, ordenados por relevancia.",
    type: "feature",
    publishedAt: new Date("2026-05-12"),
    draft: false,
  },
  {
    slug: "mejoras-seo-rendimiento-seguridad",
    file: "update-00005.md",
    title: "Mejoras de SEO, rendimiento y seguridad",
    description: "Sitemap dinámico, ThemeToggle nativo sin React, cálculo de tiempo de lectura más preciso y mejoras en los metadatos Open Graph.",
    type: "improvement",
    publishedAt: new Date("2026-05-12"),
    draft: false,
  },
  {
    slug: "correcciones-scrolltop-toc",
    file: "update-00006.md",
    title: "Correcciones: animación del ScrollToTop y tabla de contenidos",
    description: "Se corrige la animación de aparición y desaparición del botón de volver arriba, y se añaden encabezados al post de bienvenida para activar el TOC.",
    type: "bugfix",
    publishedAt: new Date("2026-05-12"),
    draft: false,
  },
];

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log("🌱 Iniciando seed...\n");

  console.log("🗑️  Limpiando datos anteriores...");
  await prisma.postView.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postTag.deleteMany();
  await prisma.session.deleteMany();
  await prisma.update.deleteMany();
  await prisma.post.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();
  await prisma.reactionType.deleteMany();
  await prisma.updateType.deleteMany();
  await prisma.role.deleteMany();

  console.log("🔄 Reiniciando secuencias de IDs...");
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('posts', 'id'), 1, false)`;
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('updates', 'id'), 1, false)`;
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('tags', 'id'), 1, false)`;
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('comments', 'id'), 1, false)`;

  // ── 1. ROLES ──────────────────────────────
  console.log("👥 Creando roles...");
  await prisma.role.createMany({ data: roles });

  // ── 2. TIPOS DE REACCIÓN ──────────────────
  console.log("❤️  Creando tipos de reacción...");
  await prisma.reactionType.createMany({ data: reactionTypes });

  // ── 3. TIPOS DE UPDATE ────────────────────
  console.log("📋 Creando tipos de update...");
  await prisma.updateType.createMany({ data: updateTypes });

  // ── 4. TAGS ───────────────────────────────
  console.log("🏷️  Creando tags...");
  await prisma.tag.createMany({ data: tags });

  // ── 5. USUARIOS ───────────────────────────
  console.log("👤 Creando usuarios...");
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const users = await Promise.all(
    usersData.map((u) => prisma.user.create({ data: { ...u, password: passwordHash } }))
  );
  const [hugo, maria, carlos, ana, david, laura, javier, elena, pablo, isabel] = users;

  // ── 6. POSTS ──────────────────────────────
  console.log("📝 Creando posts...");
  const createdPosts: { id: number; slug: string }[] = [];

  for (const { file, tags: postTags, ...postData } of postsData) {
    const content = readContent("posts", file);
    const post = await prisma.post.create({
      data: {
        ...postData,
        content,
        readingTime: estimateReadingTime(content),
        authorId: hugo.id,
        tags: {
          create: postTags.map((slug) => ({ tag: { connect: { slug } } })),
        },
      },
      select: { id: true, slug: true },
    });
    createdPosts.push(post);
  }

  // ── 7. UPDATES ────────────────────────────
  console.log("📢 Creando updates...");
  const createdUpdates: { id: number; slug: string }[] = [];
  for (const { file, type, ...updateData } of updatesData) {
    const content = readContent("updates", file);
    const update = await prisma.update.create({
      data: {
        ...updateData,
        content,
        readingTime: estimateReadingTime(content),
        author: { connect: { id: hugo.id } },
        type: { connect: { name: type } },
      },
      select: { id: true, slug: true },
    });
    createdUpdates.push(update);
  }

  // ── 8. REACCIONES ─────────────────────────
  console.log("👍 Creando reacciones...");
  const allReactionTypes = await prisma.reactionType.findMany();
  const rtId = (name: string) => allReactionTypes.find((r) => r.name === name)!.id;

  const p = (i: number) => createdPosts[i].id;

  const reactionsData = [
    // 0 — bienvenido-a-mi-blog
    { postId: p(0), userId: maria.id,  typeId: rtId("LIKE")   },
    { postId: p(0), userId: carlos.id, typeId: rtId("CLAP")   },
    { postId: p(0), userId: ana.id,    typeId: rtId("LOVE")   },
    { postId: p(0), userId: laura.id,  typeId: rtId("ROCKET") },
    // 1 — de-la-teoria-a-la-practica-junior
    { postId: p(1), userId: maria.id,  typeId: rtId("LOVE")   },
    { postId: p(1), userId: ana.id,    typeId: rtId("CLAP")   },
    { postId: p(1), userId: elena.id,  typeId: rtId("THINK")  },
    { postId: p(1), userId: david.id,  typeId: rtId("ROCKET") },
    { postId: p(1), userId: pablo.id,  typeId: rtId("BULB")   },
    // 2 — json-y-toon
    { postId: p(2), userId: carlos.id, typeId: rtId("WOW")    },
    { postId: p(2), userId: javier.id, typeId: rtId("BULB")   },
    { postId: p(2), userId: elena.id,  typeId: rtId("THINK")  },
    { postId: p(2), userId: david.id,  typeId: rtId("ROCKET") },
    { postId: p(2), userId: isabel.id, typeId: rtId("WOW")    },
    // 3 — como-organizo-mi-aprendizaje
    { postId: p(3), userId: laura.id,  typeId: rtId("BULB")   },
    { postId: p(3), userId: ana.id,    typeId: rtId("CLAP")   },
    { postId: p(3), userId: pablo.id,  typeId: rtId("LIKE")   },
    // 4 — mi-configuracion
    { postId: p(4), userId: javier.id, typeId: rtId("LIKE")   },
    { postId: p(4), userId: carlos.id, typeId: rtId("ROCKET") },
    { postId: p(4), userId: maria.id,  typeId: rtId("CLAP")   },
    { postId: p(4), userId: david.id,  typeId: rtId("WOW")    },
    // 5 — git-desde-cero
    { postId: p(5), userId: ana.id,    typeId: rtId("TROPHY") },
    { postId: p(5), userId: pablo.id,  typeId: rtId("CLAP")   },
    { postId: p(5), userId: isabel.id, typeId: rtId("LIKE")   },
    { postId: p(5), userId: laura.id,  typeId: rtId("BULB")   },
    { postId: p(5), userId: javier.id, typeId: rtId("ROCKET") },
    { postId: p(5), userId: david.id,  typeId: rtId("CLAP")   },
    // 6 — composer-php
    { postId: p(6), userId: elena.id,  typeId: rtId("LIKE")   },
    { postId: p(6), userId: carlos.id, typeId: rtId("BULB")   },
    { postId: p(6), userId: hugo.id,   typeId: rtId("TROPHY") },
    // 7 — rss
    { postId: p(7), userId: maria.id,  typeId: rtId("THINK")  },
    { postId: p(7), userId: javier.id, typeId: rtId("BULB")   },
    { postId: p(7), userId: ana.id,    typeId: rtId("LIKE")   },
    // 8 — cloudflare-astro
    { postId: p(8), userId: carlos.id, typeId: rtId("WOW")    },
    { postId: p(8), userId: elena.id,  typeId: rtId("FIRE")   },
    { postId: p(8), userId: david.id,  typeId: rtId("ROCKET") },
    { postId: p(8), userId: hugo.id,   typeId: rtId("THINK")  },
    // 9 — tendencias-2026
    { postId: p(9), userId: maria.id,  typeId: rtId("BULB")   },
    { postId: p(9), userId: laura.id,  typeId: rtId("THINK")  },
    { postId: p(9), userId: ana.id,    typeId: rtId("ROCKET") },
    { postId: p(9), userId: carlos.id, typeId: rtId("WOW")    },
    // 10 — ia-flujo-desarrollo
    { postId: p(10), userId: javier.id, typeId: rtId("THINK")  },
    { postId: p(10), userId: elena.id,  typeId: rtId("FIRE")   },
    { postId: p(10), userId: david.id,  typeId: rtId("WOW")    },
    { postId: p(10), userId: pablo.id,  typeId: rtId("BULB")   },
    { postId: p(10), userId: hugo.id,   typeId: rtId("ROCKET") },
    // 11 — sistema-apuntes
    { postId: p(11), userId: maria.id,  typeId: rtId("LOVE")   },
    { postId: p(11), userId: laura.id,  typeId: rtId("BULB")   },
    { postId: p(11), userId: ana.id,    typeId: rtId("CLAP")   },
    // 12 — lenguajes-programacion
    { postId: p(12), userId: carlos.id, typeId: rtId("THINK")  },
    { postId: p(12), userId: javier.id, typeId: rtId("WOW")    },
    { postId: p(12), userId: elena.id,  typeId: rtId("BULB")   },
    { postId: p(12), userId: david.id,  typeId: rtId("LIKE")   },
    // 13 — docker
    { postId: p(13), userId: hugo.id,   typeId: rtId("TROPHY") },
    { postId: p(13), userId: maria.id,  typeId: rtId("FIRE")   },
    { postId: p(13), userId: ana.id,    typeId: rtId("ROCKET") },
    { postId: p(13), userId: carlos.id, typeId: rtId("CLAP")   },
    { postId: p(13), userId: laura.id,  typeId: rtId("BULB")   },
    { postId: p(13), userId: pablo.id,  typeId: rtId("WOW")    },
    // 14 — como-construi-blog-astro
    { postId: p(14), userId: javier.id, typeId: rtId("TROPHY") },
    { postId: p(14), userId: elena.id,  typeId: rtId("FIRE")   },
    { postId: p(14), userId: david.id,  typeId: rtId("ROCKET") },
    { postId: p(14), userId: isabel.id, typeId: rtId("WOW")    },
    // 15 — buscador-estetica
    { postId: p(15), userId: maria.id,  typeId: rtId("LOVE")   },
    { postId: p(15), userId: laura.id,  typeId: rtId("CLAP")   },
    { postId: p(15), userId: ana.id,    typeId: rtId("WOW")    },
    // 16 — ios-macos
    { postId: p(16), userId: carlos.id, typeId: rtId("WOW")    },
    { postId: p(16), userId: javier.id, typeId: rtId("THINK")  },
    { postId: p(16), userId: pablo.id,  typeId: rtId("ROCKET") },
    // 17 — css-grid-flexbox
    { postId: p(17), userId: laura.id,  typeId: rtId("TROPHY") },
    { postId: p(17), userId: elena.id,  typeId: rtId("BULB")   },
    { postId: p(17), userId: ana.id,    typeId: rtId("CLAP")   },
    { postId: p(17), userId: carlos.id, typeId: rtId("LAUGH")  },
    { postId: p(17), userId: david.id,  typeId: rtId("LIKE")   },
    // 18 — variables-entorno
    { postId: p(18), userId: hugo.id,   typeId: rtId("TROPHY") },
    { postId: p(18), userId: maria.id,  typeId: rtId("BULB")   },
    { postId: p(18), userId: javier.id, typeId: rtId("LIKE")   },
    { postId: p(18), userId: pablo.id,  typeId: rtId("THINK")  },
    // 19 — devtools
    { postId: p(19), userId: carlos.id, typeId: rtId("WOW")    },
    { postId: p(19), userId: ana.id,    typeId: rtId("BULB")   },
    { postId: p(19), userId: elena.id,  typeId: rtId("CLAP")   },
    { postId: p(19), userId: laura.id,  typeId: rtId("ROCKET") },
    // 20 — bun
    { postId: p(20), userId: hugo.id,   typeId: rtId("FIRE")   },
    { postId: p(20), userId: david.id,  typeId: rtId("ROCKET") },
    { postId: p(20), userId: javier.id, typeId: rtId("WOW")    },
    { postId: p(20), userId: carlos.id, typeId: rtId("THINK")  },
    { postId: p(20), userId: isabel.id, typeId: rtId("LIKE")   },
    // 21 — cookies-localstorage
    { postId: p(21), userId: maria.id,  typeId: rtId("BULB")   },
    { postId: p(21), userId: ana.id,    typeId: rtId("CLAP")   },
    { postId: p(21), userId: pablo.id,  typeId: rtId("LIKE")   },
    // 22 — menta
    { postId: p(22), userId: laura.id,  typeId: rtId("LOVE")   },
    { postId: p(22), userId: elena.id,  typeId: rtId("CLAP")   },
    { postId: p(22), userId: carlos.id, typeId: rtId("WOW")    },
    // 23 — ciberseguridad
    { postId: p(23), userId: hugo.id,   typeId: rtId("FIRE")   },
    { postId: p(23), userId: javier.id, typeId: rtId("THINK")  },
    { postId: p(23), userId: david.id,  typeId: rtId("WOW")    },
    { postId: p(23), userId: ana.id,    typeId: rtId("BULB")   },
    { postId: p(23), userId: pablo.id,  typeId: rtId("ROCKET") },
    // 24 — un-ano-como-dev
    { postId: p(24), userId: maria.id,  typeId: rtId("LOVE")   },
    { postId: p(24), userId: laura.id,  typeId: rtId("CLAP")   },
    { postId: p(24), userId: ana.id,    typeId: rtId("LOVE")   },
    { postId: p(24), userId: carlos.id, typeId: rtId("TROPHY") },
    { postId: p(24), userId: elena.id,  typeId: rtId("FIRE")   },
    { postId: p(24), userId: david.id,  typeId: rtId("ROCKET") },
    { postId: p(24), userId: javier.id, typeId: rtId("CLAP")   },
  ];

  await prisma.reaction.createMany({ data: reactionsData });

  // ── 9. COMENTARIOS ────────────────────────
  console.log("💬 Creando comentarios...");

  // Post 0: bienvenido
  await prisma.comment.create({
    data: { postId: p(0), userId: maria.id, content: "¡Bienvenido al mundo del blog! Me alegra que hayas decidido compartir tu experiencia. ¡Suscrita desde ya!" },
  });

  // Post 1: junior
  const c1 = await prisma.comment.create({
    data: { postId: p(1), userId: ana.id, content: "Me siento muy identificada con esto. El síndrome del impostor es real y muy poco se habla de él. Gracias por la honestidad." },
  });
  await prisma.comment.create({
    data: { postId: p(1), userId: hugo.id, content: "Me alegra que te haya resonado, Ana. Es algo que todos vivimos y hablar de ello ayuda muchísimo.", parentId: c1.id },
  });

  // Post 5: git
  await prisma.comment.create({
    data: { postId: p(5), userId: pablo.id, content: "Justo lo que necesitaba. Llevo semanas intentando entender Git y esta guía es la más clara que he encontrado. ¡Gracias!" },
  });

  // Post 13: docker
  const c2 = await prisma.comment.create({
    data: { postId: p(13), userId: carlos.id, content: "Docker es de esas herramientas que cuando las entiendes de verdad, no puedes imaginar trabajar sin ellas. Buena explicación del Dockerfile." },
  });
  await prisma.comment.create({
    data: { postId: p(13), userId: elena.id, content: "Totalmente de acuerdo. El salto de 'funciona en mi máquina' a contenedores es enorme. Docker Compose especialmente me cambió el workflow.", parentId: c2.id },
  });

  // Post 17: css grid
  const c3 = await prisma.comment.create({
    data: { postId: p(17), userId: laura.id, content: "¡Por fin alguien explica bien cuándo usar cada uno! Siempre usaba Flexbox para todo y me complicaba la vida innecesariamente." },
  });
  await prisma.comment.create({
    data: { postId: p(17), userId: hugo.id, content: "Es el error más común, Laura. Grid parece intimidante al principio pero cuando le coges el truco no vuelves atrás.", parentId: c3.id },
  });

  // Post 24: un año
  const c4 = await prisma.comment.create({
    data: { postId: p(24), userId: maria.id, content: "Esto es exactamente lo que necesitaba leer hoy. Llevo 3 meses como junior y reconozco cada una de estas etapas. Gracias por la honestidad." },
  });
  await prisma.comment.create({
    data: { postId: p(24), userId: hugo.id, content: "¡Ánimo! Los primeros meses son los más intensos pero también los más formativos. El camino vale mucho la pena.", parentId: c4.id },
  });
  await prisma.comment.create({
    data: { postId: p(24), userId: carlos.id, content: "Lo de que las dudas 'suben de nivel' en lugar de desaparecer es muy real. Es uno de los mejores indicadores de que estás creciendo." },
  });

  // ── 10. VISTAS ────────────────────────────
  console.log("👁️  Creando vistas...");

  const postViewCounts = [180, 95, 312, 78, 234, 456, 187, 67, 145, 223, 198, 89, 134, 289, 167, 156, 78, 201, 143, 178, 234, 189, 67, 145, 312];
  const postViewsData: { postId: number; ipHash: string; viewedAt: Date }[] = [];

  createdPosts.forEach((post, i) => {
    const count = postViewCounts[i] ?? 50;
    for (let v = 0; v < count; v++) {
      const daysAgo = Math.floor(Math.random() * 180);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      postViewsData.push({
        postId: post.id,
        ipHash: `hash_${post.id}_${v}`,
        viewedAt: date,
      });
    }
  });

  await prisma.postView.createMany({ data: postViewsData });

  const updateViewCounts = [210, 145, 98, 67, 189, 54];
  const updateViewsData: { updateId: number; ipHash: string; viewedAt: Date }[] = [];

  createdUpdates.forEach((update, i) => {
    const count = updateViewCounts[i] ?? 40;
    for (let v = 0; v < count; v++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      updateViewsData.push({
        updateId: update.id,
        ipHash: `uhash_${update.id}_${v}`,
        viewedAt: date,
      });
    }
  });

  await prisma.updateView.createMany({ data: updateViewsData });

  // ── 11. SITE SETTINGS ─────────────────────
  console.log("⚙️  Creando configuración del sitio...");
  const siteSettings = [
    { key: "site_name",        label: "Nombre del sitio",    description: "Título principal del blog",                 value: "DevLog" },
    { key: "site_description", label: "Descripción",         description: "Descripción corta del sitio para SEO",      value: "Blog de desarrollo web, proyectos y tecnología." },
    { key: "site_author",      label: "Autor principal",     description: "Nombre del autor por defecto",              value: "Hugo Cayón Laso" },
    { key: "social_github",    label: "GitHub",              description: "URL de tu perfil de GitHub",                value: "https://github.com/hugocl01" },
    { key: "social_twitter",   label: "Twitter / X",         description: "URL de tu perfil de Twitter",              value: "" },
    { key: "social_linkedin",  label: "LinkedIn",            description: "URL de tu perfil de LinkedIn",             value: "" },
    { key: "contact_email",    label: "Email de contacto",   description: "Email público de contacto",                value: "hugocayon@gmail.com" },
  ];
  for (const s of siteSettings) {
    await prisma.siteSetting.upsert({ where: { key: s.key }, create: s, update: {} });
  }

  // ── RESUMEN ───────────────────────────────
  console.log("\n✅ Seed completado:");
  console.log(`   - ${roles.length} roles`);
  console.log(`   - ${reactionTypes.length} tipos de reacción`);
  console.log(`   - ${updateTypes.length} tipos de update`);
  console.log(`   - ${tags.length} tags`);
  console.log(`   - ${usersData.length} usuarios`);
  console.log(`   - ${postsData.length} posts`);
  console.log(`   - ${updatesData.length} updates`);
  console.log(`   - ${reactionsData.length} reacciones`);
  console.log(`   - ${postViewsData.length} vistas de posts`);
  console.log(`   - ${updateViewsData.length} vistas de updates`);
  console.log(`\n   Contraseña de todos los usuarios: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
