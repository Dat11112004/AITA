import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

app.listen(env.PORT, () => {
  console.log(`\n🎓 AITA Backend — http://localhost:${env.PORT}`)
  console.log(`   API base:  http://localhost:${env.PORT}/api`)
  console.log(`   Health:    GET /api/health`)
  console.log(`   CORS:      ${env.CORS_ORIGIN}\n`)
})
