const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000;

// middllware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m8ywqwd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const servicescollection = client.db('doctordb').collection('services')
        const chekoutcollection = client.db('doctordb').collection('order')

        app.get('/services', async (req, res) => {
            const cursor = servicescollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const quary = { _id: new ObjectId(id) }
            const options = {
                 // Include only the `title` and `imdb` fields in each returned document
                projection: { title: 1, price: 1, service_id: 1 },
            };
            const result = await servicescollection.findOne(quary, options)
            res.send(result)
        })

        app.post('/orders', (req, res) =>{
            const orders = req.params.body
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Doctor car is runnig')
})

app.listen(port, () => {
    console.log(`doctor car port is runnig out${port}`)
})