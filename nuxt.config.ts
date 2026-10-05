// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap',
        },
      ],
      // Apply a saved theme before first paint, so dark mode doesn't flash light on reload.
      script: [
        {
          innerHTML:
            "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}",
        },
      ],
    },
  },
})
