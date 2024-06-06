import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../Header/Header';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Reports.css';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [filteredReasons, setFilteredReasons] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await axios.get('/api/reports', { params: { search, reason } });
        setReports(response.data.reports);
        setFilteredReasons(response.data.filteredReasons);
      } catch (error) {
        console.error('Ошибка при получении отчетов:', error);
      }
    };

    fetchReports();
  }, [search, reason]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
  };

  const handleReasonChange = (event) => {
    setReason(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Здесь не нужно ничего делать, потому что useEffect уже отслеживает изменения search и reason
  };

  return (
    <div className='reports'>
        <Header />
        <div className="container">
        <h1 className="mt-3">Отчеты по установке цен</h1>
        <form className="form-inline my-3" onSubmit={handleSubmit}>
            <input
            className="form-control mr-sm-2"
            type="search"
            placeholder="Поиск"
            aria-label="Search"
            value={search}
            onChange={handleSearchChange}
            />
            <select className="form-control mr-sm-2" value={reason} onChange={handleReasonChange}>
            <option value="">Все причины</option>
            {filteredReasons.map((reason, index) => (
                <option key={index} value={reason}>
                {reason}
                </option>
            ))}
            </select>
            <button className="btn btn-outline-success my-2 my-sm-0" type="submit">
            Поиск
            </button>
        </form>
        <p>Количества товаров: {reports.length}</p>
        <div className="table-container" style={{ border: '1px solid black', maxHeight: '600px', overflowY: 'auto' }}>
            <table className="table table-bordered">
            <thead className="thead-dark">
                <tr>
                <th>Наименование товара</th>
                <th>Минимальная цена</th>
                <th>Новая цена</th>
                <th>Статус</th>
                <th>Причина</th>
                <th>Время</th>
                </tr>
            </thead>
            <tbody>
                {reports.map((report, index) => (
                <tr key={index}>
                    <td>{report.product_name}</td>
                    <td>{report.old_price}</td>
                    <td>{report.new_price}</td>
                    <td>{report.status}</td>
                    <td>{report.reason}</td>
                    <td>{report.timestamp}</td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        </div>
    </div>
  );
};

export default Reports;
