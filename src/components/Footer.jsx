function Footer({ language }) {
  return (
    <footer className="footer">
      <span>ENEATest · {language.toUpperCase()}</span>
      <span>Versión local demo</span>
    </footer>
  )
}

export default Footer
