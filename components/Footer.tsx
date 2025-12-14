'use client'

import Link from 'next/link'
import { Github, Linkedin, Mail } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
          {/* Logo y descripción */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <img 
                src="/adhoc-logo.png" 
                alt="Adhoc" 
                className="h-6 object-contain"
              />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Asistentes de IA entrenados con tu documentación, conectados a tus sistemas.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <a 
                href="https://github.com/adhoc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-adhoc-violet transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com/company/adhoc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-adhoc-violet transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="mailto:info@adhoc.inc"
                className="text-gray-400 hover:text-adhoc-violet transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Producto */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Producto</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-600 hover:text-adhoc-violet transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/chat/general" className="text-gray-600 hover:text-adhoc-violet transition-colors">
                  Tuqui Chat
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-gray-600 hover:text-adhoc-violet transition-colors">
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Empresa</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://www.adhoc.inc" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-adhoc-violet transition-colors"
                >
                  Adhoc
                </a>
              </li>
              <li>
                <a 
                  href="https://www.adhoc.inc/about" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-adhoc-violet transition-colors"
                >
                  Sobre nosotros
                </a>
              </li>
              <li>
                <a 
                  href="mailto:info@adhoc.inc"
                  className="text-gray-600 hover:text-adhoc-violet transition-colors"
                >
                  Contacto
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-6 border-t border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
            <p>
              © {currentYear} Adhoc S.A. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="https://www.adhoc.inc/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-adhoc-violet transition-colors"
              >
                Privacidad
              </a>
              <a 
                href="https://www.adhoc.inc/terms" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-adhoc-violet transition-colors"
              >
                Términos
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
