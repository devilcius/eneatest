function Footer({ language }) {
  return (
    <footer className="footer">
      <span>ENEATest · {language.toUpperCase()}</span>
      <span>Hecho con ❤️ por el equipazo MMs</span>
    </footer>
  )
}

export default Footer
