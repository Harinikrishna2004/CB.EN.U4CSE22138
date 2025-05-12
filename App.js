import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import {
  AppBar, Toolbar, Typography, Button, Container, Box, MenuItem, Select, FormControl, InputLabel,
  Card, CardContent, Tooltip, CircularProgress, Paper
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import Plot from 'react-plotly.js';

// Set axios base URL
axios.defaults.baseURL = 'http://localhost:3001';

// Main App Component
function App() {
  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Stock Price Aggregator
          </Typography>
          <Button color="inherit" component={Link} to="/">Stock Chart</Button>
          <Button color="inherit" component={Link} to="/correlation">Correlation Heatmap</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Routes>
          <Route path="/" element={<StockPage />} />
          <Route path="/correlation" element={<CorrelationHeatmap />} />
        </Routes>
      </Container>
    </Router>
  );
}

// Stock Page Component
function StockPage() {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch stock list on mount
  useEffect(() => {
  console.log('Fetching stock list from:', axios.defaults.baseURL + '/stocks');
  axios.get('/stocks')
    .then(response => {
      console.log('Stock list response:', response.data);
      // Extract ticker values from the stocks object
      const stockData = response.data.stocks
        ? Object.values(response.data.stocks)
        : [];
      if (!Array.isArray(stockData)) {
        console.error('Stock data is not an array:', stockData);
        setError('Invalid stock data format');
        setStocks([]);
      } else {
        setStocks(stockData);
      }
    })
    .catch(err => {
      console.error('Stock list fetch error:', err.message, err.response?.data);
      setError('Failed to fetch stocks');
      setStocks([]);
    });
}, []);


  // Fetch stock data when stock or minutes change
  useEffect(() => {
    if (!selectedStock) return;
    setLoading(true);
    axios.get(`/stocks/${selectedStock}?minutes=${minutes}&aggregation=average`)
      .then(response => {
        setStockData(response.data);
        setError(null);
      })
      .catch(err => setError('Failed to fetch stock data'))
      .finally(() => setLoading(false));
  }, [selectedStock, minutes]);

  const handleStockChange = (event) => {
    setSelectedStock(event.target.value);
  };

  const handleMinutesChange = (event) => {
    setMinutes(event.target.value);
  };

  const formatTooltip = (value, name, props) => {
    return [`${value.toFixed(2)}`, name];
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Stock Price Chart</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Stock</InputLabel>
          <Select value={selectedStock} onChange={handleStockChange} label="Stock">
            {stocks.map(stock => (
              <MenuItem key={stock} value={stock}>{stock}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Time Frame</InputLabel>
          <Select value={minutes} onChange={handleMinutesChange} label="Time Frame">
            <MenuItem value={30}>Last 30 mins</MenuItem>
            <MenuItem value={60}>Last 60 mins</MenuItem>
            <MenuItem value={120}>Last 120 mins</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {loading && <CircularProgress />}
      {error && <Typography color="error">{error}</Typography>}
      {stockData && (
        <Card>
          <CardContent>
            <Typography variant="h6">
              {stockData.ticker} - Average Price: ${stockData.averagePrice?.toFixed(2)}
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={stockData.priceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="lastUpdatedAt" />
                <YAxis />
                <RechartsTooltip formatter={formatTooltip} />
                <Legend />
                <Line type="monotone" dataKey="price" stroke="#1976d2" name="Price" />
                {stockData.averagePrice && (
                  <Line
                    type="monotone"
                    dataKey={() => stockData.averagePrice}
                    stroke="#d32f2f"
                    name="Average Price"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// Correlation Heatmap Component
function CorrelationHeatmap() {
  const [stocks, setStocks] = useState([]);
  const [minutes, setMinutes] = useState(60);
  const [correlationData, setCorrelationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch stock list on mount
  useEffect(() => {
    console.log('Fetching stock list from:', axios.defaults.baseURL + '/stocks');
    axios.get('/stocks')
      .then(response => {
        console.log('Stock list response:', response.data);
        const stockData = response.data.stocks ? Object.values(response.data.stocks) : [];
        if (!Array.isArray(stockData)) {
          console.error('Stock data is not an array:', stockData);
          setError('Invalid stock data format');
          setStocks([]);
        } else {
          // Limit to first 5 stocks for testing
          setStocks(stockData.slice(0, 5));
        }
      })
      .catch(err => {
        console.error('Stock list fetch error:', err.message, err.response?.data);
        setError('Failed to fetch stocks');
        setStocks([]);
      });
  }, []);

  // Fetch correlation data when stocks or minutes change
  useEffect(() => {
    if (stocks.length < 2) return;
    setLoading(true);
    const promises = [];
    for (let i = 0; i < stocks.length - 1; i++) {
      for (let j = i + 1; j < stocks.length; j++) {
        const url = `/stockcorrelation?ticker=${stocks[i]}&ticker=${stocks[j]}&minutes=${minutes}`;
        console.log('Fetching correlation from:', axios.defaults.baseURL + url);
        promises.push(
          axios.get(url)
            .then(res => {
              console.log(`Correlation response for ${stocks[i]}-${stocks[j]}:`, res.data);
              return {
                pair: [stocks[i], stocks[j]],
                correlation: res.data.correlation,
                stock1: res.data.stocks[stocks[i]],
                stock2: res.data.stocks[stocks[j]]
              };
            })
            .catch(err => {
              console.error(`Correlation error for ${stocks[i]}-${stocks[j]}:`, err.message, err.response?.status, err.response?.data);
              throw err;
            })
        );
      }
    }
    Promise.all(promises)
      .then(results => {
        const z = stocks.map(() => stocks.map(() => null));
        const annotations = [];
        const stockStats = {};
        results.forEach(({ pair, correlation, stock1, stock2 }) => {
          const [i, j] = [stocks.indexOf(pair[0]), stocks.indexOf(pair[1])];
          z[i][j] = correlation;
          z[j][i] = correlation;
          annotations.push({
            x: stocks[j],
            y: stocks[i],
            text: correlation.toFixed(2),
            showarrow: false,
            font: { color: correlation > 0 ? 'black' : 'white' }
          });
          stockStats[pair[0]] = stockStats[pair[0]] || stock1;
          stockStats[pair[1]] = stockStats[pair[1]] || stock2;
        });
        for (let i = 0; i < stocks.length; i++) {
          z[i][i] = 1;
          annotations.push({
            x: stocks[i],
            y: stocks[i],
            text: '1.00',
            showarrow: false,
            font: { color: 'black' }
          });
        }
        setCorrelationData({ z, annotations, stockStats });
        setError(null);
      })
      .catch(err => {
        console.error('Correlation fetch error:', err.message, err.response?.status, err.response?.data);
        setError('Failed to fetch correlation data. The server may be temporarily unavailable.');
      })
      .finally(() => setLoading(false));
  }, [stocks, minutes]);

  const handleMinutesChange = (event) => {
    setMinutes(event.target.value);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Correlation Heatmap</Typography>
      <FormControl sx={{ minWidth: 120, mb: 4 }}>
        <InputLabel>Time Frame</InputLabel>
        <Select value={minutes} onChange={handleMinutesChange} label="Time Frame">
          <MenuItem value={30}>Last 30 mins</MenuItem>
          <MenuItem value={60}>Last 60 mins</MenuItem>
          <MenuItem value={120}>Last 120 mins</MenuItem>
        </Select>
      </FormControl>
      {loading && <CircularProgress />}
      {error && <Typography color="error">{error}</Typography>}
      {correlationData && (
        <Paper elevation={3}>
          <Plot
            data={[{
              type: 'heatmap',
              x: stocks,
              y: stocks,
              z: correlationData.z,
              colorscale: 'RdBu',
              zmin: -1,
              zmax: 1,
              showscale: true,
              colorbar: {
                title: 'Correlation',
                titleside: 'right'
              }
            }]}
            layout={{
              title: 'Stock Price Correlation Matrix',
              annotations: correlationData.annotations,
              xaxis: { title: 'Stocks', tickangle: 45 },
              yaxis: { title: 'Stocks' },
              margin: { t: 100, r: 50, b: 100, l: 100 },
              hovermode: 'closest',
              hovertemplate: '%{x}<br>%{y}<br>Correlation: %{z:.2f}<br>' +
                            'Average Price: $%{customdata[0]:.2f}<br>' +
                            'Std Dev: $%{customdata[1]:.2f}<extra></extra>',
              customdata: stocks.map(stock => {
                const prices = correlationData.stockStats[stock]?.priceHistory.map(p => p.price) || [];
                const avg = correlationData.stockStats[stock]?.averagePrice || 0;
                const stdDev = prices.length > 1
                  ? Math.sqrt(prices.reduce((acc, p) => acc + (p - avg) ** 2, 0) / (prices.length - 1))
                  : 0;
                return [avg, stdDev];
              })
            }}
            style={{ width: '100%', height: '600px' }}
          />
        </Paper>
      )}
    </Box>
  );
}

export default App;