import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { ToastController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { AppUpdateService } from './app-update.service';

describe('AppUpdateService', () => {
  function setup(isEnabled: boolean) {
    const versionUpdates = new Subject<{ type: string }>();
    const unrecoverable = new Subject<unknown>();
    const swUpdateStub: Partial<SwUpdate> = {
      isEnabled,
      versionUpdates: versionUpdates as unknown as SwUpdate['versionUpdates'],
      unrecoverable: unrecoverable as unknown as SwUpdate['unrecoverable'],
      activateUpdate: jasmine.createSpy('activateUpdate').and.resolveTo(true),
    };

    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        { provide: SwUpdate, useValue: swUpdateStub },
        {
          provide: ToastController,
          useValue: { create: jasmine.createSpy('create') },
        },
      ],
    });

    const service = TestBed.inject(AppUpdateService);
    const toastCtrl = TestBed.inject(ToastController);
    return { service, versionUpdates, unrecoverable, toastCtrl };
  }

  it('does nothing when SwUpdate.isEnabled is false (dev/tests/unsupported browsers)', () => {
    const { service, versionUpdates, toastCtrl } = setup(false);

    service.init();
    versionUpdates.next({ type: 'VERSION_READY' });

    expect(toastCtrl.create).not.toHaveBeenCalled();
  });

  it('shows an update toast on a VERSION_READY event when isEnabled is true', () => {
    const { service, versionUpdates, toastCtrl } = setup(true);
    (toastCtrl.create as jasmine.Spy).and.resolveTo({ present: () => Promise.resolve() });

    service.init();
    versionUpdates.next({ type: 'VERSION_READY' });

    expect(toastCtrl.create).toHaveBeenCalledTimes(1);
  });

  it('ignores non-VERSION_READY version update events', () => {
    const { service, versionUpdates, toastCtrl } = setup(true);

    service.init();
    versionUpdates.next({ type: 'VERSION_DETECTED' });

    expect(toastCtrl.create).not.toHaveBeenCalled();
  });

  it('prompts a reload toast on an unrecoverable state when isEnabled is true', () => {
    const { service, unrecoverable, toastCtrl } = setup(true);
    (toastCtrl.create as jasmine.Spy).and.resolveTo({ present: () => Promise.resolve() });

    service.init();
    unrecoverable.next({});

    expect(toastCtrl.create).toHaveBeenCalledTimes(1);
  });
});
