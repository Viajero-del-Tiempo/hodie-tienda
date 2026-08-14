import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  getDocs,
  CollectionReference,
  Timestamp,
  where,
  setDoc,
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private firestore = inject(Firestore);
  private usersCollectionRef = collection(
    this.firestore,
    'users'
  ) as CollectionReference<User>;

  /**
   * Obtiene todos los usuarios de Firestore.
   */
  getUsers(): Observable<User[]> {
    return from(getDocs(this.usersCollectionRef)).pipe(
      map((snapshot) => {
        return snapshot.docs.map((doc) => {
          return { ...(doc.data() as User), uid: doc.id };
        });
      }),
    );
  }

  /**
   * Busca un usuario por número de teléfono y retorna un Observable.
   */
  getUserByPhone(phone: string): Observable<User | undefined> {
    const q = query(this.usersCollectionRef, where('phoneNumber', '==', phone));
    return from(getDocs(q)).pipe(
      map((snapshot) => {
        if (snapshot.empty) {
          return undefined;
        }
        const doc = snapshot.docs[0];
        return { ...(doc.data() as User), uid: doc.id };
      }),
    );
  }

  /**
   * Obtiene un usuario específico por su ID.
   */
  async getUser(id: string): Promise<User | undefined> {
    const userDocRef = doc(this.firestore, `users/${id}`);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return { ...(docSnap.data() as User), uid: docSnap.id };
    }
    return undefined;
  }

  /**
   * Agrega un nuevo usuario a Firestore.
   */
  async addUser(user: Omit<User, 'uid' | 'createdAt'>): Promise<void> {
    const newUid = doc(this.usersCollectionRef).id;
    const userDocRef = doc(this.firestore, `users/${newUid}`);
    const newUser: User = {
      ...user,
      uid: newUid,
      createdAt: Timestamp.fromDate(new Date()),
    };
    await setDoc(userDocRef, newUser);
  }

  /**
   * Actualiza los datos de un usuario en Firestore.
   */
  async updateUser(
    id: string,
    user: Partial<Omit<User, 'uid' | 'createdAt'>>
  ): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${id}`);
    await updateDoc(userDocRef, user);
  }

  /**
   * Elimina un usuario de Firestore.
   */
  async deleteUser(id: string): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${id}`);
    await deleteDoc(userDocRef);
  }
}
