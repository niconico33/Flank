export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white p-4 mt-8">
      <div className="container mx-auto text-center">
        <p>© {new Date().getFullYear()} Flank Board Game</p>
        <p>
          Join our community on{" "}
          <a
            href="https://discord.gg/"
            className="underline hover:text-gray-300"
          >
            Discord
          </a>
        </p>
      </div>
    </footer>
  )
} 