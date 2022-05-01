import * as THREE from 'three';
import metaversefile from './metaversefile-api.js';
import * as metaverseModules from './metaverse-modules.js';
import {scene, camera} from './renderer.js';
import * as sounds from './sounds.js';

const localVector = new THREE.Vector3();

class ZTargeting extends THREE.Object3D {
  constructor() {
    super();

    const targetReticleApp = metaversefile.createApp();
    (async () => {
      await metaverseModules.waitForLoad();

      const {modules} = metaverseModules;
      const m = modules['targetReticle'];
      await targetReticleApp.addModule(m);
    })();
    scene.add(targetReticleApp);
    this.targetReticleApp = targetReticleApp;

    this.lastFocus = false;
    this.focusTargetReticle = null;
  }
  setQueryResult(result, timestamp, focus, lastFocusChangeTime) {
    const targetReticleMesh = this.targetReticleApp.children[0];
    
    // console.log('set focus', focus);

    let reticles = result;
    if (reticles.length > 0) {
      const reticleSpecs = reticles.map(reticle => {
        localVector.copy(reticle.position)
          .project(camera);
        if (
          localVector.x >= -1 && localVector.x <= 1 &&
          localVector.y >= -1 && localVector.y <= 1 &&
          localVector.z > 0
        ) {
          return {
            reticle,
            lengthSq: localVector.lengthSq(),
          };
        } else {
          return null;
        }
      });
      for (let i = reticleSpecs.length - 1; i >= 0; i--) {
        if (reticleSpecs[i] === null) {
          reticleSpecs.splice(i, 1);
        }
      }
      reticleSpecs.sort((a, b) => a.lengthSq - b.lengthSq);
      reticles = reticleSpecs.map(reticleSpec => reticleSpec.reticle);
    }

    if (focus && !this.lastFocus) {
      // sconsole.log('got reticles', reticles);
      if (reticles.length > 0) {
        this.focusTargetReticle = reticles[0];
        sounds.playSoundName(this.focusTargetReticle.type == 'enemy' ? 'zTargetEnemy' : 'zTargetObject');
      
        const naviSoundNames = [
          'naviHey',
          'naviWatchout',
          'naviFriendly',
          'naviItem',
          'naviDanger',
        ];
        const naviSoundName = naviSoundNames[Math.floor(Math.random() * naviSoundNames.length)];
        sounds.playSoundName(naviSoundName);
      } else {
        // this.focusTargetReticle = null;
        sounds.playSoundName('zTargetCenter');
      }
    } else if (this.lastFocus && !focus) {
      if (this.focusTargetReticle) {
        // this.focusTargetReticle = null;
        sounds.playSoundName('zTargetCancel');
      }
    }

    const timeDiff = timestamp - lastFocusChangeTime;
    // console.log('focus target reticle', this.focusTargetReticle && timeDiff < 1000, timeDiff);
    const focusTime = 250;
    if (this.focusTargetReticle) {
      if (focus || timeDiff < focusTime) {
        reticles = [
          this.focusTargetReticle,
        ];
    
        let f2 = Math.min(Math.max(timeDiff / focusTime, 0), 1);
        if (focus) {
          f2 = 1 - f2;
        }
        this.focusTargetReticle.zoom = f2;
      } else {
        this.focusTargetReticle = null;
      }
    }
    
    targetReticleMesh.setReticles(reticles);

    this.lastFocus = focus;
  }
}
const zTargeting = new ZTargeting();
scene.add(zTargeting);
export default zTargeting;