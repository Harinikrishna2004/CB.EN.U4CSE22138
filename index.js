const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 3001;
require('dotenv').config();

app.use(cors());

// Your actual token
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const BASE_URL = 'http://20.244.56.144/evaluation-service/stocks';

// Middleware to add authorization header to every request
const axiosInstance = axios.create({
    headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`
    }
});

app.get('/', (req, res) => {
  res.send('Backend is running. Try /api/stocks/:symbol or /api/correlation.');
});

// Route to get the list of available stocks
app.get('/stocks', async (req, res) => {
    try {
        const response = await axiosInstance.get(BASE_URL);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching stock list:', error.message);
        res.status(500).json({ error: 'Error fetching stock list' });
    }
});

// Route to get stock price or historical data with optional aggregation
app.get('/stocks/:ticker', async (req, res) => {
    const { ticker } = req.params;
    const { minutes, aggregation } = req.query;

    try {
        // Build only the valid query string for the external API
        let url = `${BASE_URL}/${ticker}`;
        if (minutes) {
            url += `?minutes=${minutes}`;
        }

        const response = await axiosInstance.get(url);
        const data = response.data;

        if (Array.isArray(data)) {
            // Local processing for aggregation
            if (aggregation === 'average') {
                const prices = data.map(entry => entry.price);
                const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;

                return res.json({
                    ticker,
                    aggregation: 'average',
                    minutes: parseInt(minutes),
                    averagePrice: average
                });
            }

            // No aggregation requested — return full history
            return res.json({
                ticker,
                priceHistory: data
            });
        }

        // If it's a single stock price object
        return res.json({
            ticker,
            price: data.stock.price,
            lastUpdatedAt: data.stock.lastUpdatedAt
        });

    } catch (error) {
        console.error('Error fetching stock data:', error.message);
        res.status(500).json({ error: 'Error fetching stock data' });
    }
});


app.get('/stockcorrelation', async (req, res) => {
    const { minutes, ticker } = req.query;

    if (!ticker || !Array.isArray(ticker) || ticker.length !== 2) {
        return res.status(400).json({ error: "Provide exactly 2 tickers as query params like ?ticker=NVDA&ticker=PYPL" });
    }

    if (!minutes || isNaN(minutes)) {
        return res.status(400).json({ error: "Provide a valid 'minutes' parameter" });
    }

    const [ticker1, ticker2] = ticker;

    try {
        const [res1, res2] = await Promise.all([
            axiosInstance.get(`${BASE_URL}/${ticker1}?minutes=${minutes}`),
            axiosInstance.get(`${BASE_URL}/${ticker2}?minutes=${minutes}`)
        ]);

        console.log('Data for', ticker1, ':', res1.data);
        console.log('Data for', ticker2, ':', res2.data);


        const prices1 = res1.data.map(entry => entry.price);
        const prices2 = res2.data.map(entry => entry.price);

        if (prices1.length !== prices2.length) {
            const minLength = Math.min(prices1.length, prices2.length);
            prices1.splice(minLength);
            prices2.splice(minLength);
        }

        const avg1 = prices1.reduce((a, b) => a + b, 0) / prices1.length;
        const avg2 = prices2.reduce((a, b) => a + b, 0) / prices2.length;

        const covariance = prices1.reduce((acc, p, i) => acc + (p - avg1) * (prices2[i] - avg2), 0) / (prices1.length - 1);
        const stdDev1 = Math.sqrt(prices1.reduce((acc, p) => acc + (p - avg1) ** 2, 0) / (prices1.length - 1));
        const stdDev2 = Math.sqrt(prices2.reduce((acc, p) => acc + (p - avg2) ** 2, 0) / (prices2.length - 1));

        const correlation = covariance / (stdDev1 * stdDev2);

        return res.json({
            correlation: parseFloat(correlation.toFixed(4)),
            stocks: {
                [ticker1]: {
                    averagePrice: avg1,
                    priceHistory: res1.data
                },
                [ticker2]: {
                    averagePrice: avg2,
                    priceHistory: res2.data
                }
            }
        });

    } catch (error) {
    console.error('Correlation error:', error.message);
    if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
    } else if (error.request) {
        console.error('Request Error:', error.request);
    } else {
        console.error('General Error:', error.message);
    }
    res.status(500).json({ error: "Error computing correlation" });
}
});



app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
