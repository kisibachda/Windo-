import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User, Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, Firestore } from 'firebase/firestore';
import { FirebaseConfig, Task } from '../types';

class SyncService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private unsubscribe: (() => void) | null = null;
  private initialized = false;

  public initialize(config: FirebaseConfig | null) {
    if (!config || !config.apiKey || !config.projectId) {
        this.initialized = false;
        return;
    }
    
    try {
      // Avoid re-initialization if possible, though firebase SDK handles singleton check usually
      // We create a fresh app instance reference
      this.app = initializeApp(config);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.initialized = true;
      console.log("Firebase initialized successfully");
    } catch (e) {
      console.error("Firebase Initialization Failed:", e);
      this.initialized = false;
    }
  }

  public isInitialized() {
    return this.initialized;
  }

  public async login() {
    if (!this.auth) throw new Error("Cloud service not initialized. Check settings.");
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
  }

  public async logout() {
    if (this.auth) await signOut(this.auth);
    if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
    }
  }

  public onAuthChange(callback: (user: User | null) => void) {
    if (!this.auth) return () => {};
    return onAuthStateChanged(this.auth, callback);
  }

  public subscribeToTasks(user: User, onTasksReceived: (tasks: Task[]) => void) {
    if (!this.db) return;
    
    // Unsubscribe previous listener if exists
    if (this.unsubscribe) this.unsubscribe();

    const userDoc = doc(this.db, 'users', user.uid);
    
    this.unsubscribe = onSnapshot(userDoc, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.tasks)) {
          console.log("Received update from cloud", data.tasks.length);
          onTasksReceived(data.tasks);
        }
      }
    }, (error) => {
        console.error("Sync Error:", error);
    });
  }

  public async saveTasks(user: User, tasks: Task[]) {
    if (!this.db) return;
    try {
        const userDoc = doc(this.db, 'users', user.uid);
        // We overwrite the tasks array. 
        // In a more complex app, we might handle partial updates or conflicts.
        await setDoc(userDoc, { 
            tasks, 
            lastUpdated: new Date().toISOString() 
        }, { merge: true });
    } catch (e) {
        console.error("Failed to save to cloud", e);
    }
  }
}

export const syncService = new SyncService();