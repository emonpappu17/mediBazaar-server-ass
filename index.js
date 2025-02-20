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
        const medicineCollection = db.collection('medicines')

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

        // Get Discounted Products (Filtered)
        app.get('/discount-medicines', async (req, res) => {
            const discountedMedicines = await medicineCollection.find({ discount: { $gt: 0 } }).toArray();

            // Calculating discounted medicine
            const CalculatedMedicines = discountedMedicines.map((medicine) => {
                const discountAmount = (medicine.price * medicine.discount) / 100;
                const discountPrice = parseFloat((medicine.price - discountAmount).toFixed(2))

                return {
                    medicineName: medicine.name,
                    medicineImage: medicine.image,
                    originalPrice: medicine.price,
                    discountPrice: discountPrice,
                    discountPercentage: medicine.discount
                }
            })

            res.send(CalculatedMedicines)
        })

        // Get all Medicines
        app.get('/medicines', async (req, res) => {
            let { page = 1, limit = 6, sortBy, category, search } = req.query;

            // Making all are number
            page = Number(page);
            limit = Number(limit);

            const query = {};

            // Category
            if (category && category !== 'All Categories') query.category = category;

            //Search
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { genericName: { $regex: search, $options: 'i' } },
                    { company: { $regex: search, $options: 'i' } },
                ]
            }

            //Sorting
            const sortOptions = {};
            if (sortBy === 'priceLow') sortOptions.price = 1;
            if (sortBy === 'priceHigh') sortOptions.price = -1;

            //Getting all filtered and pagination medicines
            const medicines = await medicineCollection
                .find(query)
                .sort(sortOptions)
                .limit(limit)
                .skip((page - 1) * limit)
                .toArray();

            //Counting total for pagination
            const total = await medicineCollection.countDocuments(query);

            res.send({
                data: medicines,
                totalPages: Math.ceil(total / limit),
            });
        })

        // final look
        // app.get('/medicines', async (req, res) => {
        //     try {
        //         let { page = 1, limit = 6, sortBy, category, search } = req.query;

        //         // Convert to numbers
        //         page = Number(page);
        //         limit = Number(limit);

        //         if (isNaN(page) || page < 1) page = 1;
        //         if (isNaN(limit) || limit < 1) limit = 6;

        //         // Construct the query object
        //         const query = {};
        //         if (category && category !== 'All Categories') {
        //             query.category = category;
        //         }

        //         if (search) {
        //             query.$or = [
        //                 { name: { $regex: search, $options: 'i' } },
        //                 { genericName: { $regex: search, $options: 'i' } },
        //                 { company: { $regex: search, $options: 'i' } },
        //             ];
        //         }

        //         // Sorting logic
        //         const sortOptions = {
        //             priceLow: { price: 1 },
        //             priceHigh: { price: -1 },
        //         }[sortBy] || {};

        //         // Fetch data from MongoDB
        //         const medicines = await medicineCollection
        //             .find(query)
        //             .sort(sortOptions)
        //             .limit(limit)
        //             .skip((page - 1) * limit)
        //             .toArray();

        //         const total = await medicineCollection.countDocuments(query);

        //         console.log('got the query and total', total, query, page, limit);


        //         res.json({
        //             data: medicines,
        //             totalPages: Math.ceil(total / limit),
        //             currentPage: page,
        //         });

        //     } catch (error) {
        //         console.error('Error fetching medicines:', error);
        //         res.status(500).json({ error: 'Internal Server Error' });
        //     }
        // });

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