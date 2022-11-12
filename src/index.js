import express from "express" //usar protocolo http
import cors from "cors" //evitar erro de segurança
import { MongoClient } from "mongodb" //comunicação com o mongodb
import dotenv from "dotenv" //permite que a aplicação seja usada por o outros bancos
import joi from "joi"
import dayjs from "dayjs"

/////criacao da api
const app = express() //criacao da api

//////confis dos objetos
const participantSchema = joi.object({
    name: joi.string().required().min(1)
}) 

const messageSchema = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.string().valid("message", "private_message")
})

/////configurações da api
app.use(cors()) //usar a biblioteca cors que evita erro de segurança
app.use(express.json())//permite que a app entendo objetos json
dotenv.config()//permite usar o documento .env

/////o mongo db recebe o caminho para achar o banco 
const mongodb = new MongoClient(process.env.MONGO_URI)
let db 
let participants 
let messages

/////ligação com o banco
try {
    await mongodb.connect() //espero a api se conectar com o banco através do caminho que foi passado ao mongodb
    db = mongodb.db("dbBatepapouol")//dentro do endereço passado ache o banco tal
    participants = db.collection("participants")//dentro do banco tal ache a coleção tal
    messages = db.collection("messages")
} catch (error) {
    console.log(error)
}

////ROTA DE PARTICIPANTES

/////cadastro de participante
app.post("/participants", async (req, res) => {
    const candidateParticipant = req.body

    //verificações
    
    const validation = participantSchema.validate(candidateParticipant, {abortEarly: false})
    if(validation.error){
        const erros = validation.error.details.map( d => d.message)
        res.status(422).send(erros)
        return
    }
    
    const participantExist = await participants.findOne({name: candidateParticipant.name})
    if(participantExist){
        res.status(409).send({message: "participante já existe"})
        return
    }
    
    //inserir participante   
    //enviar mensagem de entrada

    try {
        await participants.insertOne({name: candidateParticipant.name, lastStatus: Date.now()})
        await messages.insertOne({from: candidateParticipant.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss')})
        res.status(201).send({message: "Participante cadastrado com sucesso."})
    } catch (error) {
        res.status(500).send(error)
    }
})

/////listagem de participantes
app.get("/participants", async (req, res) => {

    try {
        const participantsNow = await participants.find().toArray()
        res.send(participantsNow)
    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }
})

/////ROTAS DE MENSAGENS

/////cadastro de menssagens
app.post("/messages", async (req, res) => {
    const message = req.body
    const participant = req.headers.user
    const participantExist = await participants.findOne({name: participant})

    if(!participantExist){
        res.status(422).send({message: "este participante não existe na sala"})
        return
    }

    const validation = messageSchema.validate(message, {abortEarly: false})
    if(validation.error){
        const erros = validation.error.details.map( d => d.message)
        res.status(422).send(erros)
        return
    }

    const {to, text, type} = message

    try {
        await messages.insertOne({to, text, type, from: participant, time: dayjs().format('HH:mm:ss')})
        res.sendStatus(201)
    } catch (error) {
        res.status(500).send(error)
    }

    
})

/////listagem de menssagens
app.get("/messages", async (req, res) => {

    try {
        const messagesNow = await messages.find().toArray()
        res.send(messagesNow)
    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }
})

app.listen(5000, () => console.log(`Server is running in port: ${5000}`))



