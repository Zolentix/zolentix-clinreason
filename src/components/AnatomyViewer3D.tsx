'use client';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import { useState, useRef, useMemo, useCallback, useEffect, Suspense } from 'react';
import * as THREE from 'three';

export type LayerId = 'skin' | 'muscular' | 'skeletal' | 'organs' | 'vascular' | 'nervous';

const LAYER_META: Record<LayerId, { label: string; color: string; matColor: string }> = {
  skin:       { label: 'Surface',   color: '#e8c5a8', matColor: '#deb896' },
  muscular:   { label: 'Muscular',  color: '#cc3344', matColor: '#b83040' },
  skeletal:   { label: 'Skeletal',  color: '#f5f0e0', matColor: '#ede8d4' },
  organs:     { label: 'Organs',    color: '#e05577', matColor: '#d04a6a' },
  vascular:   { label: 'Vascular',  color: '#cc2200', matColor: '#cc2200' },
  nervous:    { label: 'Nervous',   color: '#ffd700', matColor: '#ffd700' },
};

/* ------------------------------------------------------------------ */
/*  TA2 name lookup for major structures                               */
/* ------------------------------------------------------------------ */
const TA2_NAMES: Record<string, string> = {
  '1038':'Frontal Bone','1050':'Parietal Bone','1055':'Occipital Bone','1057':'Sphenoid Bone',
  '1063':'Temporal Bone','1071':'Mandible','1092':'Hyoid Bone','1107':'Rib',
  '1130':'Ethmoid Bone','1134':'Vomer','1135':'Nasal Bone','1143':'Lacrimal Bone',
  '1147':'Zygomatic Bone','1151':'Maxilla','1162':'Palatine Bone','1170':'Inferior Nasal Concha',
  '1180':'Atlas (C1)','1181':'Axis (C2)','1183':'Cervical Vertebra','1194':'Thoracic Vertebra',
  '1205':'Lumbar Vertebra','1216':'Sacrum','1222':'Coccyx',
  '1227':'Sternum','1232':'Manubrium','1236':'Xiphoid Process',
  '1246':'Clavicle','1256':'Scapula','1275':'Humerus',
  '1304':'Radius','1322':'Ulna','1341':'Scaphoid','1343':'Lunate',
  '1345':'Triquetrum','1347':'Pisiform','1349':'Trapezium','1351':'Trapezoid',
  '1353':'Capitate','1355':'Hamate','1358':'Metacarpal',
  '1370':'Proximal Phalanx','1375':'Middle Phalanx','1380':'Distal Phalanx',
  '1392':'Ilium','1398':'Ischium','1403':'Pubis',
  '1416':'Femur','1452':'Patella','1455':'Tibia','1479':'Fibula',
  '1497':'Talus','1501':'Calcaneus','1505':'Navicular','1509':'Cuboid',
  '1513':'Medial Cuneiform','1517':'Intermediate Cuneiform','1521':'Lateral Cuneiform',
  '1525':'Metatarsal','1537':'Proximal Phalanx (Foot)','1542':'Distal Phalanx (Foot)',
  '2042':'Masseter','2043':'Temporalis','2044':'Lateral Pterygoid',
  '2045':'Medial Pterygoid','2047':'Buccinator','2048':'Orbicularis Oculi',
  '2049':'Orbicularis Oris','2051':'Frontalis','2053':'Occipitalis',
  '2055':'Procerus','2057':'Nasalis','2059':'Zygomaticus Major',
  '2061':'Zygomaticus Minor','2063':'Levator Labii Superioris','2065':'Depressor Anguli Oris',
  '2067':'Depressor Labii Inferioris','2069':'Mentalis','2071':'Platysma',
  '2073':'Sternocleidomastoid','2075':'Trapezius','2077':'Splenius Capitis',
  '2079':'Splenius Cervicis','2081':'Semispinalis Capitis','2083':'Semispinalis Cervicis',
  '2085':'Longissimus Capitis','2087':'Longissimus Cervicis','2089':'Longissimus Thoracis',
  '2091':'Iliocostalis Cervicis','2093':'Iliocostalis Thoracis','2095':'Iliocostalis Lumborum',
  '2097':'Spinalis Thoracis','2099':'Multifidus',
  '2113':'Rectus Capitis Posterior Major','2115':'Rectus Capitis Posterior Minor',
  '2117':'Obliquus Capitis Superior','2119':'Obliquus Capitis Inferior',
  '2129':'Scalenus Anterior','2131':'Scalenus Medius','2133':'Scalenus Posterior',
  '2141':'Pectoralis Major','2143':'Pectoralis Minor','2145':'Subclavius',
  '2147':'Serratus Anterior','2149':'Deltoid','2151':'Supraspinatus',
  '2153':'Infraspinatus','2155':'Teres Minor','2157':'Teres Major','2159':'Subscapularis',
  '2161':'Latissimus Dorsi','2163':'Rhomboid Major','2165':'Rhomboid Minor',
  '2167':'Levator Scapulae',
  '2173':'Biceps Brachii','2175':'Brachialis','2177':'Coracobrachialis',
  '2179':'Triceps Brachii','2181':'Anconeus',
  '2187':'Pronator Teres','2189':'Flexor Carpi Radialis','2191':'Palmaris Longus',
  '2193':'Flexor Carpi Ulnaris','2195':'Flexor Digitorum Superficialis',
  '2197':'Flexor Digitorum Profundus','2199':'Flexor Pollicis Longus','2201':'Pronator Quadratus',
  '2207':'Brachioradialis','2209':'Extensor Carpi Radialis Longus',
  '2211':'Extensor Carpi Radialis Brevis','2213':'Extensor Digitorum',
  '2215':'Extensor Digiti Minimi','2217':'Extensor Carpi Ulnaris','2219':'Supinator',
  '2221':'Abductor Pollicis Longus','2223':'Extensor Pollicis Brevis',
  '2225':'Extensor Pollicis Longus','2227':'Extensor Indicis',
  '2271':'Rectus Abdominis','2273':'External Oblique','2275':'Internal Oblique',
  '2277':'Transversus Abdominis','2279':'Quadratus Lumborum',
  '2283':'Psoas Major','2285':'Iliacus',
  '2289':'Diaphragm',
  '2297':'Gluteus Maximus','2299':'Gluteus Medius','2301':'Gluteus Minimus',
  '2303':'Tensor Fasciae Latae','2305':'Piriformis',
  '2307':'Obturator Internus','2309':'Obturator Externus',
  '2315':'Sartorius','2317':'Rectus Femoris',
  '2319':'Vastus Lateralis','2321':'Vastus Medialis','2323':'Vastus Intermedius',
  '2325':'Gracilis','2327':'Pectineus','2329':'Adductor Longus',
  '2331':'Adductor Brevis','2333':'Adductor Magnus',
  '2335':'Biceps Femoris','2337':'Semitendinosus','2339':'Semimembranosus',
  '2345':'Tibialis Anterior','2347':'Extensor Digitorum Longus',
  '2349':'Extensor Hallucis Longus','2351':'Peroneus Longus','2353':'Peroneus Brevis',
  '2355':'Gastrocnemius','2357':'Soleus','2359':'Plantaris',
  '2361':'Popliteus','2363':'Tibialis Posterior',
  '2365':'Flexor Digitorum Longus','2367':'Flexor Hallucis Longus',
};

function getStructureName(nodeName: string): string {
  const match = nodeName.match(/ta2-(\d+)/);
  if (match) {
    const name = TA2_NAMES[match[1]];
    if (name) {
      const side = nodeName.endsWith('.l') ? ' (Left)' : nodeName.endsWith('.r') ? ' (Right)' : '';
      return name + side;
    }
  }
  return nodeName
    .replace(/^ta2-/, 'Structure ')
    .replace(/\.l$/, ' (Left)')
    .replace(/\.r$/, ' (Right)')
    .replace(/\.m$/, '');
}

function getRegionFromY(y: number): string {
  if (y > 1.4) return 'Head & Neck';
  if (y > 1.2) return 'Thorax';
  if (y > 0.9) return 'Abdomen';
  if (y > 0.7) return 'Pelvis';
  if (y > 0.4) return 'Upper Leg';
  return 'Lower Leg & Foot';
}

/* ------------------------------------------------------------------ */
/*  GLB Model Layer                                                    */
/* ------------------------------------------------------------------ */
const GLB_GROUPS: THREE.Group[] = [];

function GLBLayer({
  url, baseColor, opacity, visible,
  highlightedName, layerTag,
}: {
  url: string; baseColor: string; opacity: number; visible: boolean;
  highlightedName: string | null;
  layerTag: string;
}) {
  const { scene } = useGLTF(url, false, true);
  const groupRef = useRef<THREE.Group>(null!);

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    const base = new THREE.Color(baseColor);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: base,
          roughness: 0.45,
          metalness: 0.05,
          clearcoat: 0.15,
          clearcoatRoughness: 0.4,
          transparent: opacity < 0.99,
          opacity,
          side: THREE.DoubleSide,
        });
        if (child.geometry) {
          child.geometry.computeBoundingSphere();
        }
      }
    });
    return clone;
  }, [scene, baseColor, opacity]);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.layerTag = layerTag;
      if (!GLB_GROUPS.includes(groupRef.current)) GLB_GROUPS.push(groupRef.current);
    }
    return () => {
      const idx = GLB_GROUPS.indexOf(groupRef.current);
      if (idx >= 0) GLB_GROUPS.splice(idx, 1);
    };
  }, [layerTag]);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhysicalMaterial) {
        const lit = highlightedName === child.name;
        child.material.emissive.set(lit ? '#10b981' : '#000000');
        child.material.emissiveIntensity = lit ? 0.4 : 0;
      }
    });
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}

function SceneClickHandler({
  onSelect,
  onHover,
}: {
  onSelect: (name: string, pos: THREE.Vector3, layerTag: string) => void;
  onHover: (name: string | null) => void;
}) {
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);
  const hoverRef = useRef<string | null>(null);
  const frameCount = useRef(0);
  const pendingClick = useRef<{ x: number; y: number } | null>(null);

  const findLayerTag = useCallback((mesh: THREE.Object3D): string => {
    let obj: THREE.Object3D | null = mesh;
    while (obj) {
      if (obj.userData?.layerTag) return obj.userData.layerTag;
      obj = obj.parent;
    }
    return 'Skeletal';
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pendingClick.current = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
    };
    canvas.addEventListener('click', handleCanvasClick);
    return () => canvas.removeEventListener('click', handleCanvasClick);
  }, [gl]);

  useEffect(() => {
    const canvas = gl.domElement;
    const trackMove = (e: MouseEvent) => { (canvas as any).__lastMoveEvent = e; };
    canvas.addEventListener('mousemove', trackMove);
    return () => canvas.removeEventListener('mousemove', trackMove);
  }, [gl]);

  useFrame(() => {
    if (pendingClick.current) {
      const { x, y } = pendingClick.current;
      pendingClick.current = null;
      mouse.set(x, y);
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(GLB_GROUPS, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const tag = findLayerTag(hit.object);
        onSelect(hit.object.name, hit.point.clone(), tag);
      }
    }

    frameCount.current++;
    if (frameCount.current % 4 !== 0) return;
    const canvas = gl.domElement;
    const lastEvent = (canvas as any).__lastMoveEvent as MouseEvent | undefined;
    if (!lastEvent) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((lastEvent.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((lastEvent.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(GLB_GROUPS, true);
    const hitName = intersects.length > 0 ? intersects[0].object.name : null;
    if (hitName !== hoverRef.current) {
      hoverRef.current = hitName;
      onHover(hitName);
      canvas.style.cursor = hitName ? 'pointer' : 'auto';
    }
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  Procedural organ/vascular/nervous (enhanced, repositioned)         */
/* ------------------------------------------------------------------ */
type ProcPart = {
  n: string; g: 'sp'|'ca'|'cy'|'bx';
  a: number[]; p: [number,number,number];
  r?: [number,number,number]; s?: [number,number,number];
  c: string; info?: string; region?: string;
};

const ORGANS: ProcPart[] = [
  { n:'Brain',         g:'sp', a:[0.075,24,24], p:[0,1.58,0.01],   s:[1,0.85,0.95], c:'#d4a0a0', info:'Cerebrum — cognitive processing, 86 billion neurons, responsible for thought, memory, language and consciousness.', region:'head' },
  { n:'Cerebellum',    g:'sp', a:[0.035,16,16], p:[0,1.52,-0.04],  c:'#c09090', info:'Cerebellum — coordination, balance and motor learning.', region:'head' },
  { n:'Thyroid',       g:'sp', a:[0.015,12,12], p:[0,1.39,0.035],  s:[1.8,0.8,0.5], c:'#cc6677', info:'Thyroid gland — produces T3/T4 hormones regulating metabolism.', region:'neck' },
  { n:'Trachea',       g:'cy', a:[0.01,0.01,0.1,12], p:[0,1.34,0.03], c:'#cc9999', info:'Trachea — cartilaginous airway connecting larynx to bronchi.', region:'neck' },
  { n:'Left Lung',     g:'sp', a:[0.055,20,20], p:[-0.06,1.22,0.01], s:[0.85,1.3,0.8], c:'#cc8899', info:'Left lung — 2 lobes, ~480 million alveoli for gas exchange.', region:'chest' },
  { n:'Right Lung',    g:'sp', a:[0.06,20,20],  p:[0.055,1.22,0.01], s:[0.9,1.3,0.8], c:'#cc8899', info:'Right lung — 3 lobes, slightly larger, handles 55% of respiratory function.', region:'chest' },
  { n:'Heart',         g:'sp', a:[0.04,20,20],  p:[-0.02,1.19,0.04], s:[1,1.1,0.85], c:'#cc2244', info:'Heart — 4 chambers, pumps ~5L/min at rest, ~100,000 beats/day.', region:'chest' },
  { n:'Liver',         g:'sp', a:[0.06,20,20],  p:[0.035,1.08,0.025], s:[1.3,0.7,0.65], c:'#8b3a2a', info:'Liver — largest internal organ (~1.5kg). 500+ metabolic functions.', region:'abdomen' },
  { n:'Stomach',       g:'sp', a:[0.04,20,20],  p:[-0.035,1.06,0.03], s:[1,1.2,0.7], c:'#cc8866', info:'Stomach — J-shaped muscular organ. Secretes HCl (pH 1.5-3.5).', region:'abdomen' },
  { n:'Spleen',        g:'sp', a:[0.025,16,16], p:[-0.09,1.08,0],   s:[1,1.3,0.6], c:'#884455', info:'Spleen — largest lymphoid organ. Filters blood, recycles iron.', region:'abdomen' },
  { n:'Pancreas',      g:'ca', a:[0.01,0.06,6,12], p:[0,1.03,0.02],  r:[0,0,0.15], c:'#ccaa77', info:'Pancreas — produces digestive enzymes and insulin/glucagon.', region:'abdomen' },
  { n:'Left Kidney',   g:'sp', a:[0.024,16,16], p:[-0.06,1.01,-0.025], s:[0.6,1,0.5], c:'#993333', info:'Left kidney — filters 180L blood/day, produces 1-2L urine.', region:'back' },
  { n:'Right Kidney',  g:'sp', a:[0.024,16,16], p:[0.06,1.01,-0.025], s:[0.6,1,0.5], c:'#993333', info:'Right kidney — slightly lower than left (displaced by liver).', region:'back' },
  { n:'Small Intestine',g:'sp', a:[0.055,20,20], p:[0,0.9,0.025],   s:[1,0.9,0.5], c:'#cc9988', info:'Small intestine — 6-7m long. Primary site of nutrient absorption.', region:'abdomen' },
  { n:'Large Intestine',g:'sp', a:[0.07,20,20],  p:[0,0.92,0.02],   s:[1,0.8,0.4], c:'#bb8877', info:'Large intestine — 1.5m colon. Water absorption, feces formation.', region:'abdomen' },
  { n:'Bladder',       g:'sp', a:[0.022,16,16], p:[0,0.78,0.035],   s:[1,0.8,0.7], c:'#ccaa55', info:'Urinary bladder — capacity 400-600mL.', region:'pelvis' },
  { n:'Diaphragm',     g:'cy', a:[0.1,0.1,0.006,20], p:[0,1.12,0.01], c:'#cc7766', info:'Diaphragm — primary respiratory muscle. Innervated by phrenic nerve (C3-C5).', region:'chest' },
];

type LinePart = { n: string; pts: [number,number,number][]; c: string; info?: string };

const VASCULAR_LINES: LinePart[] = [
  { n:'Aorta', pts:[[0,1.24,0.04],[0,1.18,0.045],[-0.01,1.08,0.035],[-0.01,0.98,0.025],[-0.01,0.88,0.015],[-0.01,0.8,0.005]], c:'#cc1100', info:'Aorta — largest artery, supplies oxygenated blood to the body' },
  { n:'L Common Carotid', pts:[[0,1.3,0.035],[-0.025,1.4,0.035],[-0.025,1.5,0.025]], c:'#cc2200', info:'Left common carotid artery — supplies blood to the brain' },
  { n:'R Common Carotid', pts:[[0,1.3,0.035],[0.025,1.4,0.035],[0.025,1.5,0.025]], c:'#cc2200', info:'Right common carotid artery' },
  { n:'L Subclavian', pts:[[-0.015,1.3,0.035],[-0.08,1.3,0.025],[-0.17,1.26,0.015]], c:'#cc2200', info:'Left subclavian artery' },
  { n:'R Subclavian', pts:[[0.015,1.3,0.035],[0.08,1.3,0.025],[0.17,1.26,0.015]], c:'#cc2200', info:'Right subclavian artery' },
  { n:'L Brachial', pts:[[-0.17,1.26,0.015],[-0.2,1.14,0.015],[-0.2,0.98,0.015]], c:'#cc3322', info:'Left brachial artery' },
  { n:'R Brachial', pts:[[0.17,1.26,0.015],[0.2,1.14,0.015],[0.2,0.98,0.015]], c:'#cc3322', info:'Right brachial artery' },
  { n:'L Common Iliac', pts:[[-0.01,0.8,0.005],[-0.04,0.76,0.005],[-0.07,0.7,0.015]], c:'#cc2200', info:'Left common iliac artery' },
  { n:'R Common Iliac', pts:[[-0.01,0.8,0.005],[0.04,0.76,0.005],[0.07,0.7,0.015]], c:'#cc2200', info:'Right common iliac artery' },
  { n:'L Femoral', pts:[[-0.07,0.7,0.015],[-0.07,0.52,0.02],[-0.07,0.38,0.015]], c:'#cc3322', info:'Left femoral artery' },
  { n:'R Femoral', pts:[[0.07,0.7,0.015],[0.07,0.52,0.02],[0.07,0.38,0.015]], c:'#cc3322', info:'Right femoral artery' },
  { n:'Inferior Vena Cava', pts:[[0.012,1.19,0.03],[0.012,1.08,0.025],[0.012,0.98,0.02],[0.012,0.88,0.01],[0.012,0.8,0]], c:'#2244aa', info:'Inferior vena cava — returns deoxygenated blood from lower body' },
  { n:'Superior Vena Cava', pts:[[0.012,1.19,0.03],[0.012,1.26,0.03],[0.012,1.32,0.03]], c:'#2244aa', info:'Superior vena cava — returns blood from upper body' },
  { n:'L Internal Jugular', pts:[[-0.035,1.32,0.025],[-0.035,1.42,0.025],[-0.03,1.48,0.02]], c:'#3355bb', info:'Left internal jugular vein' },
  { n:'R Internal Jugular', pts:[[0.035,1.32,0.025],[0.035,1.42,0.025],[0.03,1.48,0.02]], c:'#3355bb', info:'Right internal jugular vein' },
  { n:'Pulmonary Trunk', pts:[[-0.015,1.22,0.05],[-0.03,1.25,0.04],[-0.05,1.25,0.03]], c:'#4466cc', info:'Pulmonary trunk — carries deoxygenated blood to the lungs' },
  { n:'L Pulmonary Artery', pts:[[-0.05,1.25,0.03],[-0.06,1.24,0.02]], c:'#4466cc', info:'Left pulmonary artery' },
  { n:'R Pulmonary Artery', pts:[[-0.05,1.25,0.03],[0.05,1.24,0.02]], c:'#4466cc', info:'Right pulmonary artery' },
];

const NERVOUS_LINES: LinePart[] = [
  { n:'Spinal Cord', pts:[[0,1.5,-0.015],[0,1.4,-0.015],[0,1.24,-0.015],[0,1.08,-0.015],[0,0.93,-0.015],[0,0.83,-0.015]], c:'#ffd700', info:'Spinal cord — central nervous system pathway' },
  { n:'L Brachial Plexus', pts:[[0,1.3,-0.015],[-0.06,1.3,0],[-0.12,1.28,0],[-0.17,1.24,0]], c:'#eec800', info:'Left brachial plexus — innervates the upper limb' },
  { n:'R Brachial Plexus', pts:[[0,1.3,-0.015],[0.06,1.3,0],[0.12,1.28,0],[0.17,1.24,0]], c:'#eec800', info:'Right brachial plexus' },
  { n:'L Sciatic Nerve', pts:[[0,0.83,-0.025],[-0.04,0.76,-0.025],[-0.07,0.63,-0.025],[-0.07,0.42,-0.02],[-0.07,0.22,-0.015]], c:'#eec800', info:'Left sciatic nerve — largest nerve in the body' },
  { n:'R Sciatic Nerve', pts:[[0,0.83,-0.025],[0.04,0.76,-0.025],[0.07,0.63,-0.025],[0.07,0.42,-0.02],[0.07,0.22,-0.015]], c:'#eec800', info:'Right sciatic nerve' },
  { n:'L Ulnar Nerve', pts:[[-0.17,1.24,0],[-0.19,1.08,-0.005],[-0.19,0.93,-0.005],[-0.19,0.8,-0.005]], c:'#ddbb00', info:'Left ulnar nerve' },
  { n:'R Ulnar Nerve', pts:[[0.17,1.24,0],[0.19,1.08,-0.005],[0.19,0.93,-0.005],[0.19,0.8,-0.005]], c:'#ddbb00', info:'Right ulnar nerve' },
  { n:'L Median Nerve', pts:[[-0.17,1.24,0.005],[-0.19,1.08,0.005],[-0.19,0.93,0.005],[-0.19,0.8,0.005]], c:'#ddcc00', info:'Left median nerve' },
  { n:'R Median Nerve', pts:[[0.17,1.24,0.005],[0.19,1.08,0.005],[0.19,0.93,0.005],[0.19,0.8,0.005]], c:'#ddcc00', info:'Right median nerve' },
  { n:'L Femoral Nerve', pts:[[0,0.88,-0.015],[-0.035,0.83,0.01],[-0.065,0.73,0.015],[-0.065,0.52,0.015]], c:'#ddbb00', info:'Left femoral nerve — innervates anterior thigh' },
  { n:'R Femoral Nerve', pts:[[0,0.88,-0.015],[0.035,0.83,0.01],[0.065,0.73,0.015],[0.065,0.52,0.015]], c:'#ddbb00', info:'Right femoral nerve' },
  ...Array.from({length:6},(_,i)=>[
    { n:`L Intercostal Nerve ${i+1}`, pts:[[0,1.25-i*0.025,-0.015],[-0.05,1.25-i*0.025,0.02],[-0.08,1.24-i*0.025,0.03]] as [number,number,number][], c:'#ddcc44', info:`Intercostal nerve ${i+1} — innervates intercostal muscles and skin` },
    { n:`R Intercostal Nerve ${i+1}`, pts:[[0,1.25-i*0.025,-0.015],[0.05,1.25-i*0.025,0.02],[0.08,1.24-i*0.025,0.03]] as [number,number,number][], c:'#ddcc44', info:`Intercostal nerve ${i+1}` },
  ]).flat(),
];

/* ------------------------------------------------------------------ */
/*  Procedural components                                              */
/* ------------------------------------------------------------------ */
function ProcMesh({ part, onClick, onHover }: { part: ProcPart; onClick?: () => void; onHover?: (n: string|null) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  return (
    <mesh ref={ref} position={part.p} rotation={part.r ? new THREE.Euler(...part.r) : undefined} scale={part.s}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover?.(part.n); if(ref.current) ref.current.scale.multiplyScalar(1.06); }}
      onPointerOut={(e) => { e.stopPropagation(); onHover?.(null); if(ref.current && part.s) ref.current.scale.set(...part.s); else if(ref.current) ref.current.scale.set(1,1,1); }}
    >
      {part.g === 'sp' && <sphereGeometry args={part.a as [number,number,number]} />}
      {part.g === 'ca' && <capsuleGeometry args={part.a as [number,number,number,number]} />}
      {part.g === 'cy' && <cylinderGeometry args={part.a as [number,number,number,number]} />}
      {part.g === 'bx' && <boxGeometry args={part.a as [number,number,number]} />}
      <meshPhysicalMaterial color={part.c} transparent opacity={0.85} roughness={0.45} metalness={0.05} clearcoat={0.2} clearcoatRoughness={0.3} />
    </mesh>
  );
}

function TubeLine({ line, opacity }: { line: LinePart; opacity: number }) {
  const geo = useMemo(() => {
    const pts = line.pts.map(p => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 24, 0.003, 6, false);
  }, [line.pts]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={line.c} transparent opacity={opacity} emissive={line.c} emissiveIntensity={0.35} />
    </mesh>
  );
}

function OrgansLayer({ visible, onSelect, onHover }: { visible: boolean; onSelect: (p: ProcPart) => void; onHover: (n: string|null) => void }) {
  if (!visible) return null;
  return <group>{ORGANS.map(p => <ProcMesh key={p.n} part={p} onClick={() => onSelect(p)} onHover={onHover} />)}</group>;
}
function VascularLayer({ visible, opacity }: { visible: boolean; opacity: number }) {
  if (!visible) return null;
  return <group>{VASCULAR_LINES.map(l => <TubeLine key={l.n} line={l} opacity={opacity} />)}</group>;
}
function NervousLayer({ visible, opacity }: { visible: boolean; opacity: number }) {
  if (!visible) return null;
  return <group>{NERVOUS_LINES.map(l => <TubeLine key={l.n} line={l} opacity={opacity} />)}</group>;
}

/* ------------------------------------------------------------------ */
/*  Slow Rotation                                                      */
/* ------------------------------------------------------------------ */
function AutoRotate({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const angle = useRef(0);
  useFrame((_, delta) => {
    if (!enabled) return;
    angle.current += delta * 0.12;
    const r = 3;
    camera.position.x = Math.sin(angle.current) * r;
    camera.position.z = Math.cos(angle.current) * r;
    camera.position.y = 0.9;
    camera.lookAt(0, 0.9, 0);
  });
  return null;
}

/* ------------------------------------------------------------------ */
/*  Loading Indicator                                                  */
/* ------------------------------------------------------------------ */
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <div className="text-[11px] text-white/50 tracking-wider uppercase">Loading Anatomy Models</div>
        <div className="text-[9px] text-white/30">1,225 anatomical structures</div>
      </div>
    </Html>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Viewer                                                        */
/* ------------------------------------------------------------------ */
export interface AnatomyViewer3DProps {
  onSelectRegion?: (region: string, info: string) => void;
  className?: string;
}

type SelectedInfo = { name: string; displayName: string; region: string; layer: string; info?: string };

export default function AnatomyViewer3D({ onSelectRegion, className }: AnatomyViewer3DProps) {
  const [activeLayers, setActiveLayers] = useState<Set<LayerId>>(new Set(['skeletal']));
  const [selected, setSelected] = useState<SelectedInfo | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);

  const toggleLayer = useCallback((id: LayerId) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleGLBSelect = useCallback((name: string, pos: THREE.Vector3, layerTag: string) => {
    if (!pos) return;
    const displayName = getStructureName(name);
    const region = getRegionFromY(pos.y);
    const info: SelectedInfo = { name, displayName, region, layer: layerTag };
    setSelected(info);
    setAutoRotate(false);
    if (onSelectRegion) onSelectRegion(region, `${displayName} — ${layerTag} system`);
  }, [onSelectRegion]);

  const handleProcSelect = useCallback((p: ProcPart) => {
    const info: SelectedInfo = { name: p.n, displayName: p.n, region: p.region || 'body', layer: 'organs', info: p.info };
    setSelected(info);
    setAutoRotate(false);
    if (p.region && p.info && onSelectRegion) onSelectRegion(p.region, p.info);
  }, [onSelectRegion]);

  const PRESETS: Record<string, [number,number,number]> = {
    front: [0, 0.9, 3],
    back: [0, 0.9, -3],
    left: [-3, 0.9, 0],
    right: [3, 0.9, 0],
    top: [0, 3.2, 0.01],
  };

  return (
    <div className={`relative w-full h-full min-h-[500px] ${className || ''}`}>
      <Canvas
        camera={{ position: [0, 0.9, 3], fov: 42 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        onPointerDown={() => setAutoRotate(false)}
      >
        <color attach="background" args={['#080e1a']} />
        <fog attach="fog" args={['#080e1a', 4, 8]} />

        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 5, 4]} intensity={1.2} color="#fff5ee" castShadow />
        <directionalLight position={[-2, 3, -3]} intensity={0.5} color="#e0e8ff" />
        <pointLight position={[-2.5, 1.5, 2.5]} intensity={0.5} color="#10b981" distance={6} />
        <pointLight position={[2.5, 0.5, -1.5]} intensity={0.35} color="#06b6d4" distance={5} />
        <pointLight position={[0, 2.5, 0.5]} intensity={0.2} color="#8b5cf6" distance={4} />

        <AutoRotate enabled={autoRotate} />

        <Suspense fallback={<LoadingFallback />}>
          <GLBLayer url="/models/bones.glb" baseColor="#ede8d4" opacity={1}
            visible={activeLayers.has('skeletal')}
            highlightedName={hovered} layerTag="Skeletal" />
          <GLBLayer url="/models/muscles.glb" baseColor="#b83040" opacity={0.92}
            visible={activeLayers.has('muscular')}
            highlightedName={hovered} layerTag="Muscular" />
          <GLBLayer url="/models/ligaments.glb" baseColor="#6688aa" opacity={0.8}
            visible={activeLayers.has('skin')}
            highlightedName={hovered} layerTag="Connective" />
        </Suspense>

        <SceneClickHandler onSelect={handleGLBSelect} onHover={setHovered} />

        <OrgansLayer visible={activeLayers.has('organs')} onSelect={handleProcSelect} onHover={setHovered} />
        <VascularLayer visible={activeLayers.has('vascular')} opacity={1} />
        <NervousLayer visible={activeLayers.has('nervous')} opacity={1} />

        <OrbitControls
          enablePan={false}
          minDistance={0.8}
          maxDistance={6}
          target={[0, 0.9, 0]}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>

      {/* Hover Label */}
      {hovered && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#0a1628]/90 backdrop-blur-xl rounded-lg border border-emerald-500/20 shadow-lg shadow-emerald-500/5 pointer-events-none z-10">
          <div className="text-[12px] font-semibold text-white">{getStructureName(hovered)}</div>
          <div className="text-[9px] text-emerald-400/60 mt-0.5">Click to view details</div>
        </div>
      )}

      {/* Layer Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
        {([
          ['skeletal', 'Skeletal', '#f5f0e0', '240 bones'],
          ['muscular', 'Muscular', '#cc3344', '552 muscles'],
          ['skin', 'Connective', '#6688aa', '433 structures'],
          ['organs', 'Organs', '#e05577', '17 organs'],
          ['vascular', 'Vascular', '#cc2200', 'Arteries & veins'],
          ['nervous', 'Nervous', '#ffd700', 'Nerves & plexuses'],
        ] as [LayerId, string, string, string][]).map(([id, label, color, sub]) => (
          <button key={id} onClick={() => toggleLayer(id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all border ${
              activeLayers.has(id)
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-black/40 border-white/5 text-white/40 hover:text-white/60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: activeLayers.has(id) ? color : '#333' }} />
            <span>
              <span className="text-[11px] font-medium block leading-tight">{label}</span>
              <span className="text-[8px] opacity-50 block leading-tight">{sub}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Camera Presets */}
      <div className="absolute bottom-4 left-4 flex gap-1.5 z-10">
        {Object.keys(PRESETS).map(k => (
          <button key={k} onClick={() => setAutoRotate(false)}
            className="px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider border bg-black/40 border-white/5 text-white/40 hover:text-white/60 hover:bg-white/5 transition-all"
          >
            {k}
          </button>
        ))}
        <button onClick={() => setAutoRotate(!autoRotate)}
          className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all ${
            autoRotate ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'bg-black/40 border-white/5 text-white/40'
          }`}
        >
          {autoRotate ? '⏸ Auto' : '▶ Auto'}
        </button>
      </div>

      {/* Selected Part Info Panel */}
      {selected && (
        <div className="absolute top-4 right-4 w-72 bg-[#0a1628]/95 backdrop-blur-xl rounded-xl border border-white/[0.08] shadow-2xl shadow-black/50 z-20 overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[9px] text-white/30 uppercase tracking-wider">
                <span className="text-emerald-400/50">{selected.region}</span><span>›</span>
                <span className="text-white/50">{selected.layer}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-all">✕</button>
            </div>
            <h3 className="text-[14px] font-bold text-white mt-1 leading-tight">{selected.displayName}</h3>
          </div>

          <div className="flex border-b border-white/[0.06] text-[10px]">
            <div className="px-4 py-2 text-emerald-400 border-b border-emerald-400 font-semibold">Info</div>
            <div className="px-4 py-2 text-white/30">Clinical</div>
            <div className="px-4 py-2 text-white/30">Relations</div>
          </div>

          <div className="p-4 max-h-[300px] overflow-y-auto">
            {selected.info ? (
              <div className="mb-3">
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Structure / Morphology</h4>
                <p className="text-[11px] text-white/70 leading-[1.6]">{selected.info}</p>
              </div>
            ) : (
              <div className="mb-3">
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Identification</h4>
                <p className="text-[11px] text-white/70 leading-[1.6]">
                  {selected.displayName} — part of the {selected.layer.toLowerCase()} system, located in the {selected.region.toLowerCase()} region.
                </p>
                <p className="text-[9px] text-white/40 mt-2">Node: {selected.name}</p>
              </div>
            )}
            <div>
              <h4 className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Anatomical Region</h4>
              <span className="text-[10px] text-emerald-400/80 px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/10 inline-block">
                {selected.region}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="absolute bottom-4 right-4 text-[9px] text-white/25 z-10 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
        1,225+ structures · CC BY-SA 4.0 · Real anatomy meshes
      </div>
    </div>
  );
}
