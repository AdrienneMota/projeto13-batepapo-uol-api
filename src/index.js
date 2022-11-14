import express from "express" 
import cors from "cors"
import { MongoClient } from "mongodb" 
import dotenv from "dotenv" 
import joi from "joi"
import dayjs from "dayjs"

const app = express()

const participantSchema = joi.object({
    name: joi.string().required().min(1)
})

const messageSchema = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.string().valid("message", "private_message")
})

app.use(cors())
app.use(express.json())
dotenv.config()

const mongodb = new MongoClient(process.env.MONGO_URI)
let db
let participants
let messages

try {
    await mongodb.connect() 
    db = mongodb.db("dbBatepapouol")
    participants = db.collection("participants")
    messages = db.collection("messages")
} catch (error) {
    console.log(error)
}

app.post("/participants", async (req, res) => {
    const candidateParticipant = req.body

    const validation = participantSchema.validate(candidateParticipant, { abortEarly: false })
    if (validation.error) {
        const erros = validation.error.details.map(d => d.message)
        res.status(422).send(erros)
        return
    }

    const participantExist = await participants.findOne({ name: candidateParticipant.name })
    if (participantExist) {
        res.status(409).send({ message: "participante já existe" })
        return
    }

    try {
        await participants.insertOne({ name: candidateParticipant.name, lastStatus: Date.now() })
        await messages.insertOne({ from: candidateParticipant.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss') })
        res.status(201).send({ message: "Participante cadastrado com sucesso." })
    } catch (error) {
        res.status(500).send(error)
    }
})

app.get("/participants", async (req, res) => {

    try {
        const participantsNow = await participants.find().toArray()
        res.send(participantsNow)
    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }
})

setInterval(async () => {
    const ten = 10 * 1000
    const now = Date.now() - ten
  
    try {
        const participantsFiltered = await participants.find({ lastStatus: { $lt: now } }).toArray()
        console.log(participantsFiltered)

        if (participantsFiltered.length) {
            const participantsIds = participantsFiltered.map((participant) => participant._id)
            await participants.deleteMany({_id: {$in: participantsIds}})
    
            const messagesStatus = participantsFiltered.map((participant) => ({from: participant.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format('HH:mm:ss')}))
            await messages.insertMany(messagesStatus)
        }
    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }

}, 15000)

app.post("/messages", async (req, res) => {
    const message = req.body
    const participant = req.headers.user
    const participantExist = await participants.findOne({ name: participant })

    if (!participantExist) {
        res.status(422).send({ message: "Este participante não existe na sala" })
        return
    }

    const validation = messageSchema.validate(message, { abortEarly: false })
    if (validation.error) {
        const erros = validation.error.details.map(d => d.message)
        res.status(422).send(erros)
        return
    }

    const { to, text, type } = message

    try {
        await messages.insertOne({ to, text, type, from: participant, time: dayjs().format('HH:mm:ss') })
        res.sendStatus(201)
    } catch (error) {
        res.status(500).send(error)
    }

})

app.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit)
    const participant = req.headers.user

    try {
        let query = messages.find().sort({time: -1})
        if(limit){
            query = query.limit(limit)
        }
        
        const allMessages = await query.toArray()
        const messagesFiltered = allMessages.filter(message => (((message.type === "status") || (message.type === "message")) || (message.type === "private_message" && (message.to === participant || message.from === participant))))
        res.send(messagesFiltered.reverse()) 
     
    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }

})

app.post("/status", async (req, res) => {
    const participant = req.headers.user

    try {
        const participantExist = await participants.findOne({ name: participant })

        if (!participantExist) {
            res.sendStatus(404)
            return
        }
        await participants.updateOne({ name: participant }, { $set: { lastStatus: Date.now() } })
        res.sendStatus(200)
    } catch (error) {
        res.sendStatus(500)
    }
})

app.listen(5000, () => console.log(`Server is running in port: ${5000}`))





