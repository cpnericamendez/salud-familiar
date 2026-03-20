// ─────────────────────────────────────────────────────────────
//  CONFIGURACIÓN DE FIREBASE — Proyecto: salud-familiar
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

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
export const storage = getStorage(app)

// Permite usar la app sin internet (los cambios se sincronizan cuando vuelve la conexión)
enableIndexedDbPersistence(db).catch(() => {})
