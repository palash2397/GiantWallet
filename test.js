import axios from "axios";

const API_KEY = process.env.SWAPKIT_API_KEY;

 const getQuote = async () => {
  const response = await axios.get("https://api.swapkit.dev/quote", {
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
    params: {
      fromChain: "ETH",
      toChain: "BSC",
      fromAsset: "ETH.ETH",
      toAsset: "BSC.USDT",
      amount: 0.1,
      address: "0x07566B42F332EA92642E04826707815Bb45472F6",
    },
  });
  console.log(response.data);
 };

getQuote();
