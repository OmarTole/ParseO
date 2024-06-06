
import './Header.css';

const Header = () => {


    return (
        <header className='header'>
            <a href="/">Главная</a>
            {/* <a href="/logs">Посмотреть логи</a> */}
            <a href="/products">База данных</a>
            <a href="/reports">Отчеты</a>
        </header>
    )
}

export default Header;