import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../Header/Header';
import './Main.css';

function Main() {
  const [logs, setLogs] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [completedProducts, setCompletedProducts] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [message, setMessage] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      const response = await axios.get('/api/logs');
      setLogs(response.data);
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartParsing = async () => {
    setIsParsing(true);
    try {
      const response = await axios.post('/api/start-parser', { showBrowser });
      setMessage(response.data);
      const logsResponse = await axios.get('/api/logs');
      setLogs(logsResponse.data);
    } catch (error) {
      console.error('Ошибка при парсинге:', error);
      setMessage('Ошибка при парсинге');
    }
    setIsParsing(false);
  };

  const handleUpdatePrices = async () => {
    setIsUpdating(true);
    try {
      const response = await axios.post('/api/start-update-prices', { showBrowser });
      setMessage(response.data);
      const logsResponse = await axios.get('/api/logs');
      setLogs(logsResponse.data);
    } catch (error) {
      console.error('Ошибка при обновлении цен:', error);
      setMessage('Ошибка при обновлении цен');
    }
    setIsUpdating(false);
  };

  // const handleStopProcess = async () => {
  //   try {
  //     await axios.post('/api/start-update-prices', { isParsing });
  //     setMessage('Процесс остановлен');
  //   } catch (error) {
  //     console.error('Ошибка при остановке процесса:', error);
  //     setMessage('Ошибка при остановке процесса');
  //   }
  // };

  const handleShowBrowserChange = (event) => {
    setShowBrowser(event.target.checked);
  };

  useEffect(() => {
    // This effect fetches the total and completed products from the server
    const fetchProgress = async () => {
      const response = await axios.get('/api/progress');
      setTotalProducts(response.data.totalProducts);
      setCompletedProducts(response.data.completedProducts);
    };

    fetchProgress();
    const interval = setInterval(fetchProgress, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="Main">
      <Header />
      <div className='main'>
        <main>
          <h1>Парсинг товаров</h1>
          <button className='start' onClick={handleStartParsing} disabled={isParsing || isUpdating}>
            {isParsing ? 'Парсинг...' : 'Начать парсинг'}
          </button>
          <button className='start' onClick={handleUpdatePrices} disabled={isUpdating || isParsing}>
            {isUpdating ? 'Изменение цен...' : 'Запустить изменение цен'}
          </button>
          {/* <button className='stop' onClick={handleStopProcess} disabled={!isUpdating && !isParsing}>
            Остановить процесс
          </button> */}
          <p>
            {showBrowser ? 'Скрыть браузер' : 'Показать браузер'}
            <input
              type="checkbox"
              checked={showBrowser}
              onChange={handleShowBrowserChange}
            />
          </p>
          <p>Завершено: {completedProducts} из {totalProducts} товаров</p>
          <div id="logs-container" style={{ overflowY: 'auto', maxHeight: '300px', border: '1px solid #ccc', padding: '10px' }}>
            {logs.slice().reverse().map((log, index) => (
              <p key={index}>{log}</p>
            ))}
          </div>
          {message && <p>{message}</p>}
        </main>
      </div>
    </div>
  );
}

export default Main;
