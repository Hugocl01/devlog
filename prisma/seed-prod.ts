// ═══════════════════════════════════════════════════════════════
// SEED DE PRODUCCIÓN — Primera instalación en el VPS
// Solo crea los datos esenciales: configuración base + tu usuario.
// No genera usuarios de prueba, comentarios, reacciones ni vistas.
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
// CONFIGURACIÓN BASE
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
  { name: "improvement", label: "Mejora",              color: "#3b82f6" },
  { name: "general",     label: "General",             color: "#6b7280" },
];

const tags = [
  { name: "JavaScript",               slug: "javascript",               color: "#f7df1e" },
  { name: "TypeScript",               slug: "typescript",               color: "#3178c6" },
  { name: "PHP",                      slug: "php",                      color: "#8892bf" },
  { name: "CSS",                      slug: "css",                      color: "#264de4" },
  { name: "Swift",                    slug: "swift",                    color: "#f05138" },
  { name: "Git",                      slug: "git",                      color: "#f05032" },
  { name: "Node.js",                  slug: "nodejs",                   color: "#339933" },
  { name: "Docker",                   slug: "docker",                   color: "#2496ed" },
  { name: "Bun",                      slug: "bun",                      color: "#c8a97e" },
  { name: "Composer",                 slug: "composer",                 color: "#885630" },
  { name: "Astro",                    slug: "astro",                    color: "#ff5d01" },
  { name: "React",                    slug: "react",                    color: "#61dafb" },
  { name: "SwiftUI",                  slug: "swiftui",                  color: "#0070c9" },
  { name: "Cloudflare",               slug: "cloudflare",               color: "#f38020" },
  { name: "Obsidian",                 slug: "obsidian",                 color: "#7c3aed" },
  { name: "RSS",                      slug: "rss",                      color: "#fe6600" },
  { name: "iOS",                      slug: "ios",                      color: "#007aff" },
  { name: "macOS",                    slug: "macos",                    color: "#a2aaad" },
  { name: "Apple",                    slug: "apple",                    color: "#555555" },
  { name: "Desarrollo web",           slug: "desarrollo-web",           color: "#e34f26" },
  { name: "Frontend",                 slug: "frontend",                 color: "#06b6d4" },
  { name: "Backend",                  slug: "backend",                  color: "#6366f1" },
  { name: "DevOps",                   slug: "devops",                   color: "#f59e0b" },
  { name: "DevSecOps",                slug: "devsecops",                color: "#2563eb" },
  { name: "Seguridad",                slug: "seguridad",                color: "#dc2626" },
  { name: "Ciberseguridad",           slug: "ciberseguridad",           color: "#ef4444" },
  { name: "IA",                       slug: "ia",                       color: "#10b981" },
  { name: "Inteligencia artificial",  slug: "inteligencia-artificial",  color: "#10b981" },
  { name: "Diseño web",               slug: "diseno-web",               color: "#ec4899" },
  { name: "Menta",                    slug: "menta",                    color: "#3eb489" },
  { name: "Tecnología",               slug: "tecnologia",               color: null },
  { name: "Proyectos",                slug: "proyectos",                color: null },
  { name: "Junior",                   slug: "junior",                   color: null },
  { name: "Experiencia",              slug: "experiencia",              color: null },
  { name: "Crecimiento",              slug: "crecimiento",              color: null },
  { name: "Historia",                 slug: "historia",                 color: null },
  { name: "JSON",                     slug: "json",                     color: null },
  { name: "TOON",                     slug: "toon",                     color: null },
  { name: "LLMs",                     slug: "llms",                     color: null },
  { name: "XML",                      slug: "xml",                      color: null },
  { name: "Aprendizaje",              slug: "aprendizaje",              color: null },
  { name: "Productividad",            slug: "productividad",            color: null },
  { name: "Estudio",                  slug: "estudio",                  color: null },
  { name: "Herramientas",             slug: "herramientas",             color: null },
  { name: "Software",                 slug: "software",                 color: null },
  { name: "Versionado",               slug: "versionado",               color: null },
  { name: "Buenas prácticas",         slug: "buenas-practicas",         color: null },
  { name: "Mantenimiento",            slug: "mantenimiento",            color: null },
  { name: "Frameworks",               slug: "frameworks",               color: null },
  { name: "Edge computing",           slug: "edge-computing",           color: null },
  { name: "Programación",             slug: "programacion",             color: null },
  { name: "Lenguajes de programación",slug: "lenguajes-de-programacion",color: null },
  { name: "TIOBE Index",              slug: "tiobe-index",              color: null },
  { name: "Desarrollo de software",   slug: "desarrollo-de-software",   color: null },
  { name: "Contenedores",             slug: "contenedores",             color: null },
  { name: "Infraestructura",          slug: "infraestructura",          color: null },
  { name: "UI/UX",                    slug: "ui-ux",                    color: null },
  { name: "Buscador",                 slug: "buscador",                 color: null },
  { name: "Diseño",                   slug: "diseno",                   color: null },
  { name: "Actualizaciones",          slug: "actualizaciones",          color: null },
  { name: "Rendimiento",              slug: "rendimiento",              color: null },
  { name: "Depuración",               slug: "depuracion",               color: null },
  { name: "Workflow",                 slug: "workflow",                 color: null },
  { name: "Desarrollo",               slug: "desarrollo",               color: null },
  { name: "Carrera",                  slug: "carrera",                  color: null },
  { name: "Reflexión",                slug: "reflexion",                color: null },
];

const siteSettings = [
  { key: "site_name",        label: "Nombre del sitio",  description: "Título principal del blog",            value: "DevLog" },
  { key: "site_description", label: "Descripción",       description: "Descripción corta del sitio para SEO", value: "Blog de desarrollo web, proyectos y tecnología." },
  { key: "site_author",      label: "Autor principal",   description: "Nombre del autor por defecto",         value: "Hugo Cayón Laso" },
  { key: "social_github",    label: "GitHub",            description: "URL de tu perfil de GitHub",           value: "https://github.com/hugocl01" },
  { key: "social_twitter",   label: "Twitter / X",       description: "URL de tu perfil de Twitter",          value: "" },
  { key: "social_linkedin",  label: "LinkedIn",          description: "URL de tu perfil de LinkedIn",         value: "" },
  { key: "contact_email",    label: "Email de contacto", description: "Email público de contacto",            value: "hugocayon@gmail.com" },
];

// ─────────────────────────────────────────────
// POSTS
// ─────────────────────────────────────────────

const postsData = [
  { slug: "bienvenido-a-mi-blog",               file: "post-000001.md", title: "Bienvenido a mi blog",                                                                  description: "Un espacio donde comparto mis experiencias como desarrollador web, mis proyectos personales y curiosidades sobre tecnología.",                                                                                                     publishedAt: new Date("2025-11-13"), draft: false, tags: ["desarrollo-web", "tecnologia", "proyectos"] },
  { slug: "de-la-teoria-a-la-practica-junior",  file: "post-000002.md", title: "De la Teoría a la Práctica: Mis 4 Meses Como Junior",                                  description: "Un relato honesto sobre lo que realmente significa empezar en el mundo profesional del desarrollo web: dudas, logros, aprendizajes y crecimiento.",                                                                                publishedAt: new Date("2025-11-15"), draft: false, tags: ["desarrollo-web", "junior", "experiencia", "crecimiento"] },
  { slug: "json-y-toon-soluciones-de-su-epoca", file: "post-000003.md", title: "La Razón de Ser de JSON y TOON: Soluciones a Problemas de Época",                      description: "Descubre por qué JSON reemplazó a XML y por qué el nuevo formato TOON está desafiando a JSON en el mundo de la Inteligencia Artificial.",                                                                                        publishedAt: new Date("2025-11-30"), draft: false, tags: ["historia", "json", "toon", "ia", "inteligencia-artificial", "llms", "xml"] },
  { slug: "como-organizo-mi-aprendizaje",        file: "post-000004.md", title: "Cómo organizo mi aprendizaje como desarrollador web",                                  description: "Mi sistema personal para aprender nuevas tecnologías de forma constante, sin perder el rumbo ni la motivación.",                                                                                                               publishedAt: new Date("2025-12-01"), draft: false, tags: ["aprendizaje", "desarrollo-web", "productividad", "estudio", "crecimiento"] },
  { slug: "mi-configuracion-para-desarrollar",   file: "post-000005.md", title: "Mi configuración para desarrollar aplicaciones",                                       description: "Así es el entorno que utilizo para desarrollar aplicaciones web: hardware, software, extensiones, herramientas y ajustes de productividad.",                                                                                    publishedAt: new Date("2025-12-07"), draft: false, tags: ["desarrollo-web", "herramientas", "productividad", "software"] },
  { slug: "git-desde-cero-guia-basica",          file: "post-000006.md", title: "Git desde cero: guía básica de control de versiones para desarrolladores",             description: "Aprende Git desde cero: qué es, para qué sirve y cómo usar los comandos básicos para gestionar versiones de tu código.",                                                                                                       publishedAt: new Date("2025-12-16"), draft: false, tags: ["git", "versionado", "buenas-practicas", "devops", "mantenimiento"] },
  { slug: "composer-en-php-guia-completa",       file: "post-000007.md", title: "Composer en PHP: guía completa para empezar",                                          description: "Aprende qué es Composer, cómo instalarlo y cómo gestionar dependencias en proyectos PHP de forma profesional.",                                                                                                               publishedAt: new Date("2026-01-11"), draft: false, tags: ["php", "composer", "backend"] },
  { slug: "ahora-tenemos-rss",                   file: "post-000008.md", title: "Ahora tenemos RSS: qué es, cómo funciona y por qué te interesa",                       description: "Te explico qué es un RSS feed, cómo funciona y por qué deberías suscribirte al feed de este blog para no perderte nada.",                                                                                                     publishedAt: new Date("2026-01-16"), draft: false, tags: ["rss", "xml", "tecnologia"] },
  { slug: "cloudflare-adquiere-equipo-astro",    file: "post-000009.md", title: "Cloudflare adquiere al equipo de Astro: qué significa para el desarrollo web",         description: "Analizo la reciente compra del equipo de Astro por Cloudflare y por qué puede ser un punto de inflexión en frameworks web y edge computing en 2026.",                                                                           publishedAt: new Date("2026-01-22"), draft: false, tags: ["astro", "cloudflare", "frameworks", "desarrollo-web"] },
  { slug: "tendencias-tecnologicas-2026",        file: "post-000010.md", title: "Las principales tendencias tecnológicas que están marcando 2026 en desarrollo web",    description: "Un análisis de las tendencias tecnológicas actuales que están transformando el desarrollo web en 2026 y qué deberías dominar como desarrollador.",                                                                                   publishedAt: new Date("2026-01-23"), draft: false, tags: ["desarrollo-web", "ia", "inteligencia-artificial", "productividad", "edge-computing"] },
  { slug: "ia-en-el-flujo-de-desarrollo",        file: "post-000011.md", title: "La IA en el flujo de desarrollo: ¿herramienta imprescindible o fuente de incertidumbre?", description: "Analizo cómo la inteligencia artificial está transformando el proceso de desarrollo de software en 2026, sus beneficios, riesgos y cómo puedes sacar provecho sin perder calidad.",                                                  publishedAt: new Date("2026-01-31"), draft: false, tags: ["ia", "desarrollo-web", "productividad", "herramientas"] },
  { slug: "mi-sistema-de-apuntes",               file: "post-000012.md", title: "Mi sistema de apuntes como desarrollador",                                             description: "Cómo organizo mis apuntes técnicos combinando papel y Obsidian para aprender mejor, recordar más y tomar mejores decisiones como desarrollador.",                                                                               publishedAt: new Date("2026-02-06"), draft: false, tags: ["obsidian", "aprendizaje", "desarrollo-web", "productividad"] },
  { slug: "tendencias-lenguajes-programacion-2026", file: "post-000013.md", title: "Tendencias de lenguajes de programación en 2026",                                   description: "Análisis actualizado de los 15 lenguajes de programación más populares según el índice TIOBE de febrero de 2026, con sectores y usos comunes.",                                                                              publishedAt: new Date("2026-02-14"), draft: false, tags: ["programacion", "lenguajes-de-programacion", "tiobe-index", "desarrollo-de-software"] },
  { slug: "que-es-docker-y-por-que-aprenderlo",  file: "post-000014.md", title: "¿Qué es Docker y por qué todo desarrollador debería entenderlo?",                      description: "Descubre qué es Docker, cómo funcionan los contenedores y por qué entender esta tecnología es fundamental para cualquier desarrollador moderno.",                                                                             publishedAt: new Date("2026-03-08"), draft: false, tags: ["docker", "devops", "backend", "contenedores", "infraestructura"] },
  { slug: "como-construi-mi-blog-con-astro",     file: "post-000015.md", title: "Cómo construí mi blog con Astro: arquitectura, componentes y trucos",                  description: "Explicación técnica y ejemplos de código de mi blog en Astro.",                                                                                                                                                              publishedAt: new Date("2026-03-09"), draft: false, tags: ["astro", "proyectos", "desarrollo-web"] },
  { slug: "buscador-inteligente-estetica-renovada", file: "post-000016.md", title: "Buscador inteligente y estética renovada: La nueva experiencia DevLog",             description: "Nuevo buscador instantáneo con Pagefind y la evolución de nuestra identidad visual hacia un sistema más táctil, fluido y coherente.",                                                                                          publishedAt: new Date("2026-04-18"), draft: false, tags: ["astro", "ui-ux", "buscador", "diseno", "actualizaciones"] },
  { slug: "primer-experimento-app-ios-macos",    file: "post-000017.md", title: "Mi primer experimento creando una app para iOS y macOS",                               description: "Empiezo un pequeño proyecto personal para aprender Swift y desarrollar una aplicación de tareas sencilla para el ecosistema Apple.",                                                                                          publishedAt: new Date("2026-05-07"), draft: false, tags: ["swift", "swiftui", "ios", "macos", "apple", "aprendizaje"] },
  { slug: "css-grid-vs-flexbox",                 file: "post-000018.md", title: "CSS Grid vs Flexbox: cuándo usar cada uno de verdad",                                  description: "No es uno mejor que el otro. Grid y Flexbox resuelven problemas distintos. En este artículo aprenderás a identificar cuándo usar cada uno.",                                                                                  publishedAt: new Date("2026-05-18"), draft: false, tags: ["css", "frontend", "diseno-web", "desarrollo-web"] },
  { slug: "variables-de-entorno-y-secretos",     file: "post-000020.md", title: "Variables de entorno y secretos: cómo gestionar la configuración de tus proyectos",   description: "Las variables de entorno no son solo para ocultar contraseñas. Son la forma correcta de separar configuración de código.",                                                                                                    publishedAt: new Date("2026-05-18"), draft: false, tags: ["seguridad", "backend", "buenas-practicas", "desarrollo-web", "devops"] },
  { slug: "browser-devtools-a-fondo",            file: "post-000021.md", title: "Browser DevTools a fondo: la herramienta que tienes abierta y no aprovechas",          description: "Las DevTools del navegador son mucho más que un inspector de elementos. Aprende a usar los paneles de red, rendimiento, memoria y aplicación.",                                                                                 publishedAt: new Date("2026-05-18"), draft: false, tags: ["herramientas", "frontend", "desarrollo-web", "rendimiento", "depuracion"] },
  { slug: "bun-runtime-javascript",              file: "post-000022.md", title: "Bun: el runtime JavaScript que quiere reemplazar a Node.js",                           description: "Bun no es solo un runtime más rápido. Es un intento de rediseñar el ecosistema JavaScript desde cero: runtime, gestor de paquetes, bundler y test runner en uno solo.",                                                    publishedAt: new Date("2026-05-18"), draft: false, tags: ["javascript", "bun", "nodejs", "herramientas", "backend", "rendimiento"] },
  { slug: "cookies-localstorage-sessionstorage", file: "post-000023.md", title: "Cookies, localStorage y sessionStorage: diferencias, usos y cuándo elegir cada uno", description: "Los tres sirven para guardar datos en el navegador, pero funcionan de forma muy distinta.",                                                                                                                                              publishedAt: new Date("2026-05-18"), draft: false, tags: ["javascript", "frontend", "seguridad", "desarrollo-web"] },
  { slug: "menta-gestor-de-tiempo",              file: "post-000024.md", title: "Menta: Por qué creé mi propio gestor de tiempo para el trabajo",                       description: "Cansado de la fricción al registrar tiempos por tickets, decidí crear Menta: una solución rápida, centralizada y con estética minimalista.",                                                                                  publishedAt: new Date("2026-05-21"), draft: false, tags: ["productividad", "desarrollo", "herramientas", "workflow", "menta", "proyectos"] },
  { slug: "ciberseguridad-2026-amenazas",        file: "post-000025.md", title: "Ciberseguridad en 2026: amenazas emergentes y qué deben saber los desarrolladores web", description: "Un análisis completo de las principales tendencias de ciberseguridad para 2026 y cómo los desarrolladores web pueden adaptarse.",                                                                                                     publishedAt: new Date("2026-05-22"), draft: false, tags: ["ciberseguridad", "desarrollo-web", "seguridad", "devsecops", "ia"] },
  { slug: "un-ano-como-desarrollador-web",       file: "post-000026.md", title: "Un año como desarrollador web: lo que nadie te cuenta",                                description: "El 28 de junio de 2025 firmé mi primer contrato como desarrollador web. Un año después, esto es lo que he aprendido, lo que me sorprendió y lo que le diría al Hugo de entonces.",                                          publishedAt: new Date("2026-05-18"), draft: false, tags: ["carrera", "desarrollo", "reflexion", "junior", "aprendizaje"] },
];

// ─────────────────────────────────────────────
// UPDATES
// ─────────────────────────────────────────────

const updatesData = [
  { slug: "novedades-astro6-tailwind4",         file: "update-00001.md", type: "improvement", title: "Novedades en el blog: Astro 6, Tailwind 4 y mucho más",                           description: "Descubre las últimas actualizaciones del blog: migración a Astro 6, implementación de Tailwind CSS 4 y mejoras en la experiencia de usuario.", publishedAt: new Date("2026-03-29"), draft: false },
  { slug: "busqueda-instantanea-estetica-moderna", file: "update-00002.md", type: "feature",  title: "Búsqueda Instantánea y Estética Moderna: El siguiente nivel de DevLog",          description: "Cómo hemos transformado la búsqueda en DevLog utilizando Pagefind para obtener resultados instantáneos y una interfaz moderna y actual.",       publishedAt: new Date("2026-04-18"), draft: false },
  { slug: "tabla-de-contenidos-inteligente",    file: "update-00003.md", type: "feature",     title: "Tabla de Contenidos Inteligente en los Posts",                                    description: "Los posts de DevLog estrenan una tabla de contenidos lateral que sigue tu posición en el artículo en tiempo real.",                              publishedAt: new Date("2026-04-19"), draft: false },
  { slug: "nueva-seccion-posts-relacionados",   file: "update-00004.md", type: "feature",     title: "Nueva sección: Posts relacionados",                                               description: "Al final de cada artículo aparece ahora una selección de posts con etiquetas en común, ordenados por relevancia.",                              publishedAt: new Date("2026-05-12"), draft: false },
  { slug: "mejoras-seo-rendimiento-seguridad",  file: "update-00005.md", type: "improvement", title: "Mejoras de SEO, rendimiento y seguridad",                                         description: "Sitemap dinámico, ThemeToggle nativo sin React, cálculo de tiempo de lectura más preciso y mejoras en los metadatos Open Graph.",               publishedAt: new Date("2026-05-12"), draft: false },
  { slug: "correcciones-scrolltop-toc",         file: "update-00006.md", type: "bugfix",      title: "Correcciones: animación del ScrollToTop y tabla de contenidos",                  description: "Se corrige la animación de aparición y desaparición del botón de volver arriba, y se añaden encabezados al post de bienvenida para activar el TOC.", publishedAt: new Date("2026-05-12"), draft: false },
];

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log("🚀 Seed de producción iniciado\n");

  // ── 1. ROLES ──────────────────────────────
  console.log("👥 Roles...");
  for (const r of roles) {
    await prisma.role.upsert({ where: { id: r.id }, create: r, update: r });
  }

  // ── 2. TIPOS DE REACCIÓN ──────────────────
  console.log("❤️  Tipos de reacción...");
  for (const rt of reactionTypes) {
    await prisma.reactionType.upsert({ where: { name: rt.name }, create: rt, update: rt });
  }

  // ── 3. TIPOS DE UPDATE ────────────────────
  console.log("📋 Tipos de update...");
  for (const ut of updateTypes) {
    await prisma.updateType.upsert({ where: { name: ut.name }, create: ut, update: ut });
  }

  // ── 4. TAGS ───────────────────────────────
  console.log("🏷️  Tags...");
  for (const t of tags) {
    await prisma.tag.upsert({ where: { slug: t.slug }, create: t, update: { name: t.name, color: t.color } });
  }

  // ── 5. SITE SETTINGS ──────────────────────
  console.log("⚙️  Configuración del sitio...");
  for (const s of siteSettings) {
    await prisma.siteSetting.upsert({ where: { key: s.key }, create: s, update: {} });
  }

  // ── 6. USUARIO ADMIN ──────────────────────
  console.log("👤 Usuario administrador...");
  const passwordHash = await bcrypt.hash("DevLog2025!", 12);
  await prisma.user.upsert({
    where: { email: "hugocayon@gmail.com" },
    create: {
      name:          "Hugo Cayón Laso",
      email:         "hugocayon@gmail.com",
      password:      passwordHash,
      roleId:        2,
      emailVerified: true,
      bio:           "Desarrollador web y creador de DevLog.",
    },
    update: {},
  });
  const hugo = await prisma.user.findUniqueOrThrow({ where: { email: "hugocayon@gmail.com" } });

  // ── 7. POSTS ──────────────────────────────
  console.log("📝 Posts...");
  for (const { file, tags: postTags, ...postData } of postsData) {
    const content = readContent("posts", file);
    await prisma.post.upsert({
      where: { slug: postData.slug },
      create: {
        ...postData,
        content,
        readingTime: estimateReadingTime(content),
        authorId: hugo.id,
        tags: { create: postTags.map((slug) => ({ tag: { connect: { slug } } })) },
      },
      update: {
        title: postData.title,
        description: postData.description,
        content,
        readingTime: estimateReadingTime(content),
        draft: postData.draft,
        publishedAt: postData.publishedAt,
      },
    });
  }

  // ── 8. UPDATES ────────────────────────────
  console.log("📢 Updates...");
  for (const { file, type, ...updateData } of updatesData) {
    const content = readContent("updates", file);
    await prisma.update.upsert({
      where: { slug: updateData.slug },
      create: {
        ...updateData,
        content,
        readingTime: estimateReadingTime(content),
        author: { connect: { id: hugo.id } },
        type:   { connect: { name: type } },
      },
      update: {
        title:       updateData.title,
        description: updateData.description,
        content,
        readingTime: estimateReadingTime(content),
        draft:       updateData.draft,
        publishedAt: updateData.publishedAt,
      },
    });
  }

  // ── RESUMEN ───────────────────────────────
  console.log("\n✅ Seed de producción completado:");
  console.log(`   - ${roles.length} roles`);
  console.log(`   - ${reactionTypes.length} tipos de reacción`);
  console.log(`   - ${updateTypes.length} tipos de update`);
  console.log(`   - ${tags.length} tags`);
  console.log(`   - 1 usuario admin (hugocayon@gmail.com)`);
  console.log(`   - ${postsData.length} posts`);
  console.log(`   - ${updatesData.length} updates`);
  console.log("\n⚠️  Cambia la contraseña del admin en cuanto puedas:");
  console.log("   Accede a /auth/forgot-password para restablecerla.");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
