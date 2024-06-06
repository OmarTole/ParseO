import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Products.css';
import Header from '../Header/Header'
import 'bootstrap/dist/css/bootstrap.min.css';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get('/api/products', { params: { search } });
                setProducts(response.data);
            } catch (error) {
                console.error('Ошибка при получении продуктов:', error);
            }
        };

        fetchProducts();
    }, [search]);

    const handleSearch = (event) => {
        setSearch(event.target.value);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setSearch(search);
    };

    const handleEditProduct = (product) => {
        setSelectedProduct(product);
    };

    const handleSaveChanges = async (event) => {
        event.preventDefault();
        const { id, min_price, compare_link } = selectedProduct;

        try {
            await axios.post(`/api/update-price/${id}`, { min_price, compare_link });
            setSelectedProduct(null);
            setSearch(search); // Trigger refresh
            // После успешного сохранения изменений, обновите список продуктов
            const response = await axios.get('/api/products', { params: { search } });
            setProducts(response.data);

            console.log('Обновленные продукты:', response.data); // Логирование обновленных продуктов
        } catch (error) {
            console.error('Ошибка при обновлении продукта:', error);
        }
    };


    const handleChange = (event) => {
        const { name, value } = event.target;
        setSelectedProduct({ ...selectedProduct, [name]: value });
    };

    return (
        <div className='products'>
            <Header></Header>
            <div className="container products">
                <div className='mainProducts'>
                    <h1>Товары</h1>
                    <form className="form-inline my-2 my-lg-0" onSubmit={handleSubmit}>
                        <input
                            className="form-control mr-sm-2"
                            type="search"
                            placeholder="Поиск по названию"
                            aria-label="Search"
                            value={search}
                            onChange={handleSearch}
                        />
                        <button className="btn btn-outline-success my-2 my-sm-0" type="submit">
                            Поиск
                        </button>
                    </form>
                    <p className='tLeng'>Количество опубликованных товаров: {products.length}</p>
                    <ul className="list-group product-list mt-3" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {products.map((product) => (
                            <li key={product.id} className="list-group-item">
                                <div>
                                    <ul>
                                        <li>{product.name}</li>
                                        <li>
                                            Минимальная цена: <span style={{ color: product.min_price ? 'black' : 'red' }}>
                                                {product.min_price || 'Не установлена'}
                                            </span>
                                        </li>
                                        <li>
                                            Ссылка на изменение цен: <span style={{ color: product.compare_link ? 'black' : 'red' }}>
                                                {product.compare_link || 'Не установлена'}
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                                <button
                                    className="btn btn-primary float-right"
                                    onClick={() => handleEditProduct(product)}
                                    data-toggle="modal"
                                    data-target={`#editModal${product.id}`}
                                >
                                    Изменить
                                </button>
                            </li>
                        ))}
                    </ul>

                    {selectedProduct && (
                        <div className="change-modal modal fade show" style={{ display: 'block' }}>
                            <div className="modal-dialog" role="document">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title">{selectedProduct.name}</h5>
                                        <button type="button" className="close" onClick={() => setSelectedProduct(null)}>
                                            <span aria-hidden="true">&times;</span>
                                        </button>
                                    </div>
                                    <div className="modal-body">
                                        <form onSubmit={handleSaveChanges}>
                                            <div className="form-group">
                                                <div>
                                                    <label htmlFor="min_price">Минимальная цена</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="form-control"
                                                        name="min_price"
                                                        value={selectedProduct.min_price}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="compare_link">Ссылка для парсинга</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        name="compare_link"
                                                        value={selectedProduct.compare_link}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                            </div>
                                            <button type="submit" className="btn btn-primary">
                                                Сохранить изменения
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Products;
