import { Component, ViewChild, AfterViewInit, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog'; // Import MatDialog
import { Subject, takeUntil } from 'rxjs'; // Import Subject and takeUntil
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // Import MatSnackBarModule for notifications

// --- MÓDULOS DE ANGULAR MATERIAL ---
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';

// --- Servicios y Modelos ---
import { UserService } from '@core/services/user.service';
import { User } from '@core/models/user.model'; // Import User model and UserRole
import { UserFormDialogComponent } from '../user-form-dialog/user-form-dialog.component'; // Import UserFormDialogComponent
import { UserDetailDialogComponent } from '../user-detail-dialog/user-detail-dialog.component'; // Import UserDetailDialogComponent

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // Material
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTooltipModule,
    MatSnackBarModule
],
  templateUrl: './user-list-component.html',
  styleUrls: ['./user-list-component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent implements AfterViewInit, OnInit, OnDestroy {

  // Columnas a mostrar
  displayedColumns: string[] = ['avatar', 'displayName', 'phoneNumber', 'role', 'createdAt', 'actions'];
  dataSource: MatTableDataSource<User>;
  private destroy$ = new Subject<void>(); // Subject to manage subscriptions

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private userService: UserService, // Inject UserService
    private dialog: MatDialog, // Inject MatDialog
    private snackBar: MatSnackBar // Inject MatSnackBar
  ) {
    this.dataSource = new MatTableDataSource<User>(); // Initialize with empty data source
  }

  ngOnInit() {
    this.loadUsers();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers() {
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe((users: User[]) => { // Explicitly type users
        this.dataSource.data = users;
      });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // CRUD Operations
  addUser() {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '400px',
      data: { user: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        let profileStatus: 'complete' | 'incomplete' = 'incomplete';
        if (result.shippingAddress && result.shippingAddress.street && result.billingAddress && result.billingAddress.street) {
          profileStatus = 'complete';
        }

        const newUser: Omit<User, 'uid' | 'createdAt'> = {
          displayName: result.displayName,
          phoneNumber: result.phoneNumber,
          role: result.role,
          profile_status: profileStatus,
          whatsapp_verified: false,
          addresses: [],
        };

        if (result.shippingAddress && result.shippingAddress.street) {
          newUser.addresses = [result.shippingAddress];
        }

        if (result.billingAddress && result.billingAddress.street) {
          newUser.billingAddress = result.billingAddress;
        }

        this.userService.addUser(newUser).then(() => {
          this.snackBar.open('Usuario agregado exitosamente', 'Cerrar', { duration: 3000 });
          this.loadUsers();
        }).catch((error: any) => { // Explicitly type error
          this.snackBar.open('Error al agregar usuario: ' + error.message, 'Cerrar', { duration: 3000 });
        });
      }
    });
  }

  viewUserDetails(user: User) {
    this.dialog.open(UserDetailDialogComponent, {
      width: '600px',
      data: { user: user }
    });
  }

  editUser(user: User) {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '400px',
      data: { user: user }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && user.uid) {
        let profileStatus: 'complete' | 'incomplete' = 'incomplete';
        if (result.shippingAddress && result.shippingAddress.street && result.billingAddress && result.billingAddress.street) {
          profileStatus = 'complete';
        }

        const updatedUserData: Partial<Omit<User, 'uid' | 'createdAt'>> = {
          displayName: result.displayName,
          phoneNumber: result.phoneNumber,
          role: result.role,
          profile_status: profileStatus,
        };

        if (result.shippingAddress && result.shippingAddress.street) {
          updatedUserData.addresses = [result.shippingAddress];
        } else {
          updatedUserData.addresses = [];
        }

        if (result.billingAddress && result.billingAddress.street) {
          updatedUserData.billingAddress = result.billingAddress;
        } else {
          (updatedUserData as any).billingAddress = null;
        }

        this.userService.updateUser(user.uid, updatedUserData).then(() => {
          this.snackBar.open('Usuario actualizado exitosamente', 'Cerrar', { duration: 3000 });
          this.loadUsers();
        }).catch((error: any) => { // Explicitly type error
          this.snackBar.open('Error al actualizar usuario: ' + error.message, 'Cerrar', { duration: 3000 });
        });
      }
    });
  }

  deleteUser(user: User) {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${user.displayName}?`)) {
      if (user.uid) {
        this.userService.deleteUser(user.uid).then(() => {
          this.snackBar.open('Usuario eliminado exitosamente', 'Cerrar', { duration: 3000 });
          this.loadUsers();
        }).catch((error: any) => { // Explicitly type error
          this.snackBar.open('Error al eliminar usuario: ' + error.message, 'Cerrar', { duration: 3000 });
        });
      }
    }
  }
}