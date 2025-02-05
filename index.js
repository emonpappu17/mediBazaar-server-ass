const express = require('express');
const app = express();
require('dotenv').config()
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const port = 8000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aezqr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // All collection
        const db = client.db('mediBazaar')
        const userCollection = db.collection('users')
        const advertiseCollection = db.collection('advertisements')
        const categoryCollection = db.collection('categories')
        
        // Storing user to DB
        app.post('/users', async (req, res) => {
            const user = req.body;
            const email = user.email;

            // checking if user already exists
            const isExist = await userCollection.findOne({ email })
            if (isExist) {
                return res.send('Exists this user')
            }

            // Adding new user to db
            const newUser = { ...user, createdAt: new Date() };
            const result = await userCollection.insertOne(newUser)
            return res.send(result);
        })

        // Get all advertised medicines
        app.get('/advertised-medicines', async (req, res) => {
            const result = await advertiseCollection.find().toArray();
            return res.send(result)
        })

        // Get All Categories
        app.get('/categories', async (req, res) => {
            const result = await categoryCollection.find().toArray();
            return res.send(result)
        })

        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('done')
})

app.listen(port, () => {
    console.log(`app listing on ports ${port}`);
})