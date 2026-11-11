import { createApp } from './app.js'

const PORT = Number(process.env.PORT ?? 3001)
const { httpServer } = createApp()

httpServer.listen(PORT, () => {
  console.log(`🦝 סלון הגו של טאנוקי מאזין על http://localhost:${PORT}`)
})
