const axios = require('axios');

// Define the access token you received
const accessToken = process.env.ACCESS_TOKEN;

// Base URL for the stock exchange API
const baseUrl = 'http://20.244.56.144/evaluation-service/stocks';

// Function to fetch the list of stocks
async function getStocks() {
    try {
        const response = await axios.get(baseUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}` // Add the access token to the Authorization header
            }
        });
        return response.data.stocks;
    } catch (error) {
        console.error('Error fetching stock list:', error.response ? error.response.data : error.message);
        throw new Error('Error fetching stock list');
    }
}

// Function to fetch a specific stock's price
async function getStockPrice(ticker) {
    try {
        const response = await axios.get(`${baseUrl}/${ticker}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}` // Add the access token to the Authorization header
            }
        });
        return response.data.stock;
    } catch (error) {
        throw new Error(`Error fetching stock price for ${ticker}:`, error.message);
    }
}

// Function to fetch stock price history
async function getStockPriceHistory(ticker, minutes) {
    try {
        const response = await axios.get(`${baseUrl}/${ticker}?minutes=${minutes}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}` // Add the access token to the Authorization header
            }
        });
        return response.data;
    } catch (error) {
        throw new Error(`Error fetching stock price history for ${ticker}:`, error.message);
    }
}

module.exports = { getStocks, getStockPrice, getStockPriceHistory };
