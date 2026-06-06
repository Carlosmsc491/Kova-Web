import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey:            'AIzaSyDtNBnapSe11VNGOXCsRhZ_wsKRKQj750c',
  authDomain:        'kona-finances.firebaseapp.com',
  projectId:         'kona-finances',
  storageBucket:     'kona-finances.firebasestorage.app',
  messagingSenderId: '438045737411',
  appId:             '1:438045737411:web:b055121b206dc0e9003d76',
  measurementId:     'G-7N754Q14NJ',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Analytics — optional, ignore if blocked by adblocker
try { getAnalytics(app) } catch (_) {}

export default app
