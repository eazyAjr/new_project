import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret'

app.use(cors())
app.use(express.json())

// 注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' })
    }
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return res.status(409).json({ message: '用户名已存在' })
    }
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { username, password: hashed },
      select: { id: true, username: true, createdAt: true },
    })
    return res.status(201).json({ message: '注册成功', user })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: '服务器错误' })
  }
})

// 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' })
    }
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '7d',
    })
    return res.json({ message: '登录成功', token, user: { id: user.id, username: user.username } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: '服务器错误' })
  }
})

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

export default app
