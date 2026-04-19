---
title: "Tabla de Contenidos Inteligente en los Posts"
description: "Los posts de DevLog estrenan una tabla de contenidos lateral que sigue tu posición en el artículo en tiempo real."
date: 2026-04-19
author: "Hugo Cayón Laso"
type: "feature"
---

## Navegación dentro de los artículos

Para los posts más extensos, ahora aparece una barra lateral derecha con el índice del artículo, construida a partir de los encabezados `H2` y `H3` del propio contenido.

- **Basada en Astro**: El parser extrae los `headings` en tiempo de compilación, por lo que la estructura del TOC es estática y sin JavaScript en el servidor.
- **Resaltado activo con `IntersectionObserver`**: Un observador nativo sigue qué sección es visible en pantalla e ilumina en verde el enlace correspondiente, manteniendo el resto en gris suave.
- **Scroll al clic**: Hacer clic en cualquier enlace navega directamente a ese subtítulo.
- **Solo en pantallas grandes**: En móvil y tablet (`< 1280px`) el TOC se oculta automáticamente. En laptop y escritorio aparece anclado a la derecha con posición `sticky`.

---

## Cambios en el layout

Para acomodar el TOC sin romper el diseño existente, el interior de `PostLayout.astro` pasó a usar un contenedor `flex` con dirección de fila en pantallas `xl`. El artículo conserva su `max-width` original y el componente `TOC.astro` vive de forma completamente autónoma en la columna lateral.
