// ─────────────────────────────────────────────────────────────
//  CONFIGURACIÓN DE FIREBASE — Proyecto: salud-familiar
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            "AIzaSyDpcg9XgtU2jdHVljydsnaTVeF_Oh9P0zU",
  authDomain:        "salud-familiar-e0d33.firebaseapp.com",
  projectId:         "salud-familiar-e0d33",
  storageBucket:     "salud-familiar-e0d33.firebasestorage.app",
  messagingSenderId: "731200048577",
  appId:             "1:731200048577:web:5276eea4cdbc45bf097340"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

// Permite usar la app sin internet
enableIndexedDbPersistence(db).catch(() => {})
