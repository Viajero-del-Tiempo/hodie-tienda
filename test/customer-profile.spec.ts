import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ProfilePage } from '../src/app/pages/profile/profile-page';
import { UserService } from '../src/app/core/services/user.service';
import { OrderService } from '../src/app/core/services/order.service';
import { userFixture, addressFixture, shippingOptions } from './helpers/customer-fixtures';

describe('Mi perfil: borrador y versión', () => {
  let users: jasmine.SpyObj<UserService>;
  beforeEach(() => {
    users = jasmine.createSpyObj('Users', ['getMyProfile', 'updateMyProfile', 'validateRuc']);
    users.getMyProfile.and.returnValue(of(userFixture())); users.updateMyProfile.and.resolveTo(userFixture());
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideNoopAnimations(),
      { provide: UserService, useValue: users }, { provide: OrderService, useValue: { getShippingOptions: () => of(shippingOptions()) } },
    ] });
  });
  function start() { const fixture = TestBed.createComponent(ProfilePage); fixture.detectChanges(); flushMicrotasks(); fixture.detectChanges(); return fixture; }
  it('muestra teléfono sin edición, permite nombre, direcciones y predeterminados con IDs estables', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance;
    expect(fixture.nativeElement.textContent).toContain('test-phone'); expect(fixture.nativeElement.querySelector('[formControlName="phoneNumber"]')).toBeNull();
    page.nameForm.controls.displayName.setValue('Nombre editado'); page.editAddress(0); fixture.detectChanges(); tick(250);
    page.addressEditor!.controls['street'].setValue('Referencia editada'); page.applyAddress();
    expect(page.draft?.addresses[0].id).toBe('test-address'); page.draft!.defaultAddressId = 'test-address'; page.removeAddress(1);
    void page.save(); flushMicrotasks();
    const payload = users.updateMyProfile.calls.mostRecent().args[0];
    expect(payload.version).toBe('test-version'); expect(payload.displayName).toBe('Nombre editado');
    expect(payload.addresses.length).toBe(1); expect(payload.addresses[0].street).toBe('Referencia editada');
    expect(payload.defaultAddressId).toBe('test-address'); expect(Object.keys(payload)).not.toContain('phoneNumber');
  }));
  it('primera dirección/facturación van sin ID ni predeterminado inventado', fakeAsync(() => {
    users.getMyProfile.and.returnValue(of(userFixture(false))); const fixture = start(); const page = fixture.componentInstance;
    page.editAddress(); fixture.detectChanges(); page.addressEditor!.patchValue(addressFixture()); tick(250); page.applyAddress();
    expect(page.draft!.addresses[0].id).toBeUndefined(); expect(page.draft!.defaultAddressId).toBeUndefined();
    page.editBilling(); page.billingEditor!.patchValue({ legalName: 'Persona Alfa', ruc: '1234567', confirmedRuc: '1234567-9' });
    page.rucReady = true; page.applyBilling();
    expect(page.draft!.billingProfiles[0].id).toBeUndefined(); expect(page.draft!.defaultBillingProfileId).toBeUndefined();
    void page.save(); flushMicrotasks(); expect(users.updateMyProfile.calls.mostRecent().args[0].billingProfiles[0].confirmedRuc).toBe('1234567-9');
  }));
  it('409 explica el cambio y consultar datos actuales no pisa borrador ni versión', fakeAsync(() => {
    users.updateMyProfile.and.rejectWith({ status: 409, error: { field: 'version', code: 'PROFILE_VERSION_CONFLICT', error: 'El perfil cambió: direcciones.', changes: [{ field: 'addresses' }] } });
    const fixture = start(); const page = fixture.componentInstance;
    page.nameForm.controls.displayName.setValue('Mi borrador'); page.draft!.addresses[0].street = 'Referencia en borrador';
    void page.save(); flushMicrotasks(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('El perfil cambió: direcciones.');
    const draft = structuredClone(page.draft);
    users.getMyProfile.and.returnValue(of({ ...userFixture(), version: 'test-next-version', displayName: 'Nombre remoto' }));
    void page.inspectConflict(); flushMicrotasks(); fixture.detectChanges();
    expect(page.draft).toEqual(draft); expect(page.nameForm.value.displayName).toBe('Mi borrador');
    expect(page.latest?.displayName).toBe('Nombre remoto'); expect(page.draft?.version).toBe('test-version');
    page.keepDraft(); expect(page.draft?.version).toBe('test-next-version'); expect(page.draft?.addresses[0].street).toBe('Referencia en borrador');
    expect(users.updateMyProfile).toHaveBeenCalledTimes(1);
  }));
  it('error por fila sigue junto a la dirección y al campo cuando se abre el editor', fakeAsync(() => {
    users.updateMyProfile.and.rejectWith({ status: 400, error: { field: 'addresses[0].street', error: 'Revisá esta referencia.' } });
    const fixture = start(); const page = fixture.componentInstance; void page.save(); flushMicrotasks(); fixture.detectChanges();
    expect(page.rowError('addresses', 0)).toBe('Revisá esta referencia.'); page.editAddress(0); fixture.detectChanges(); tick(250); fixture.detectChanges();
    expect(page.addressEditor!.controls['street'].errors?.['server']).toBe('Revisá esta referencia.');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[formControlName="street"]');
    expect(input.closest('mat-form-field')?.textContent).toContain('Revisá esta referencia.');
    page.addressEditor!.controls['street'].setValue('Referencia corregida'); fixture.detectChanges();
    expect(page.addressEditor!.controls['street'].hasError('server')).toBeFalse();
    expect(input.closest('mat-form-field')?.textContent).not.toContain('Revisá esta referencia.');
  }));
});
