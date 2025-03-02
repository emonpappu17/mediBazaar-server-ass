const express = require('express');
const app = express();
require('dotenv').config()
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');


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
        const cartCollection = db.collection('carts')

        // JWT api
        app.post('jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign({}, 'secret', { expiresIn: '1h' });
            res.send({ token });
        })

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

        // Get all Category based Medicines
        app.get('/medicines/category/:categoryName', async (req, res) => {
            try {
                let { categoryName } = req.params;
                const { sortBy, search } = req.query;
                const query = { category: categoryName };
                if (search) {
                    query.$or = [
                        { name: { $regex: search, $options: 'i' } },
                        { genericName: { $regex: search, $options: 'i' } },
                        { company: { $regex: search, $options: 'i' } },
                    ];
                }
                const sortOptions = {
                    priceLow: { price: 1 },
                    priceHigh: { price: -1 },
                }[sortBy] || {}

                console.log('query', query, search, sortBy, sortOptions);
                const medicines = await medicineCollection.find(query).sort(sortOptions).toArray();
                res.send(medicines)
            } catch (err) {
                console.log(err);
            }
        })


        // Adding medicine to cart
        app.post('/cart', async (req, res) => {
            const { email, medicineId, name, image, price, discount, quantity } = req.body;
            const finalPrice = price - (price * (discount / 100));
            const existingCart = await cartCollection.findOne({ email })

            if (existingCart) {
                const itemIndex = existingCart.items.findIndex(item => item.medicineId === medicineId);
                if (itemIndex > -1) {
                    existingCart.items[itemIndex].quantity += quantity; //increase its quantity
                } else {
                    existingCart.items.push({ medicineId, name, image, price, discount, finalPrice, quantity })
                }
                await cartCollection.updateOne(
                    { email },
                    { $set: { items: existingCart.items, updatedAt: new Date() } });
                return res.send({ message: "Cart updated successfully" })
            } else {
                const newCart = {
                    email,
                    items: [{ medicineId, name, image, price, discount, finalPrice, quantity }],
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await cartCollection.insertOne(newCart);
                return res.send({ message: "Cart created successfully" })
            }
        })

        // Get Cart Items for a User
        app.get('/cart/:email', async (req, res) => {
            const { email } = req.params;
            // console.log('yes hitted', email);

            const cart = await cartCollection.findOne({ email });
            if (!cart) return res.send({ items: [], totalPrice: 0 });
            const totalPrice = cart.items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
            const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0)
            // console.log('totalQuantity', totalQuantity);

            res.send({ items: cart.items, totalPrice, totalQuantity });
        })

        //Update Cart Item quantity
        app.patch('/cart/:email', async (req, res) => {
            const { email } = req.params;
            const { medicineId, quantity } = req.body;
            // console.log('from patch cart', email, medicineId, quantity);


            const cart = await cartCollection.findOne({ email });
            if (!cart) return res.send({ message: "Cart not found" })

            const itemIndex = cart.items.findIndex(item => item.medicineId === medicineId);
            if (itemIndex > -1) {
                // console.log(cart.items[itemIndex].quantity);
                cart.items[itemIndex].quantity = quantity;
            } else {
                return res.send({ message: "Item not found in cart" })
            }
            await cartCollection.updateOne({ email }, {
                $set: {
                    items: cart.items,
                    updatedAt: new Date()
                }
            })
            res.send({ message: "Cart item updated successfully" })
        })

        // Remove an Item from Cart
        app.delete('/cart/:email/:medicineId', async (req, res) => {
            try {
                const { email, medicineId } = req.params;
                const result = await cartCollection.updateOne({ email }, { $pull: { items: { medicineId } } });
                res.send(result)
            }
            catch (err) {
                console.log(err);
            }
        })

        // Clear Entire Cart
        app.delete('/cart/:email', async (req, res) => {
            try {
                const { email } = req.params;

                const result = await cartCollection.deleteOne({ email });
                res.send(result)
            } catch (err) {
                console.log("Error clearing cart:", err);
            }
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