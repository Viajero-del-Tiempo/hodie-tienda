import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private uploadUrl = `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/image/upload`;

  constructor(private http: HttpClient) { }

  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    // Corregido: Usar el uploadPreset definido en el entorno.
    // Este preset debe estar configurado como "unsigned" en tu dashboard de Cloudinary.
    formData.append('upload_preset', environment.cloudinary.uploadPreset);
    // Opcional: para organizar imágenes en Cloudinary
    formData.append('folder', 'hodie-tienda'); 

    return this.http.post(this.uploadUrl, formData);
  }
}
