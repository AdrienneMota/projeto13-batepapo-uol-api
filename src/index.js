import express from "express" //usar protocolo http
import cors from "cors" //evitar erro de segurança
import { MongoClient } from "mongodb" //comunicação com o mongodb
import dotenv from "dotenv" //permite que a aplicação seja usada por o outros bancos

/////criacao da api
const app = express() //criacao da api

/////configurações da api
app.use(cors()) //usar a biblioteca cors que evita erro de segurança
app.use(express.json())//permite que a app entendo objetos json
dotenv.config()//permite usar o documento .env

/////o mongo db recebe o caminho para achar o banco 
const mongodb = new MongoClient(process.env.MONGO_URI)
let db 
let participants 

/////ligação com o banco
try {
    await mongodb.connect() //espero a api se conectar com o banco através do caminho que foi passado ao mongodb
    db = mongodb.db("dbBatepapouol")//dentro do endereço passado ache o banco tal
    participants = db.collection("participants")//dentro do banco tal ache a coleção tal
} catch (error) {
    console.log(error)
}

/////cadastro de participante
app.post("/participants", async (req, res) => {
    const { name } = req.body
    let listParticipants
    
    try {
        listParticipants = await participants.find().toArray()
    } catch (error) {
        console.log(error)
    }

    const participantExist = listParticipants.find((p) => p.name === name)
    if(participantExist){
        res.status(409).send({ message: "participante já existe, escolha outro nome"})
        return
    }

    if(!name){
        res.status(422).send({message: "O nome do parcipante deve ser strings não vazio"})
        return
    }

    const participant = {name, lastStatus: Date.now()}   

    try {
        await participants.insertOne(participant)
        res.status(201).send({message: "Participante criado com sucesso."})
    } catch (error) {
        res.status(500).send(error)
    }
})

/////listagem de participantes
app.get("/participants", async (req, res) => {
    let participantsNow = []

    try {
        participantsNow = await participants.find().toArray()
        res.send(participantsNow)
    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }
})

app.listen(5000, () => console.log(`Server is running in port: ${5000}`))



