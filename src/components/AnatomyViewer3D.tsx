'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Environment } from '@react-three/drei';
// postprocessing removed — Bloom is incompatible with current three.js version
import { useState, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export type LayerId = 'skin' | 'muscular' | 'skeletal' | 'organs' | 'vascular' | 'nervous';

type Part = {
  n: string;           // display name
  g: 'sp' | 'ca' | 'cy' | 'bx'; // sphere | capsule | cylinder | box
  a: number[];         // geometry args
  p: [number, number, number];
  r?: [number, number, number];
  s?: [number, number, number];
  c: string;           // color hex
  info?: string;       // tooltip/info
  region?: string;     // body region for clinical mapping
};

type LinePart = {
  n: string;
  pts: [number, number, number][];
  c: string;
  w?: number; // lineWidth (unused in WebGL but we use tube)
  info?: string;
};

const LAYER_META: Record<LayerId, { label: string; color: string; icon: string }> = {
  skin:       { label: 'Surface',   color: '#e8c5a8', icon: '👤' },
  muscular:   { label: 'Muscular',  color: '#cc3344', icon: '💪' },
  skeletal:   { label: 'Skeletal',  color: '#f5f0e0', icon: '🦴' },
  organs:     { label: 'Organs',    color: '#e05577', icon: '🫀' },
  vascular:   { label: 'Vascular',  color: '#cc2200', icon: '🩸' },
  nervous:    { label: 'Nervous',   color: '#ffd700', icon: '⚡' },
};

/* ------------------------------------------------------------------ */
/*  Body Structure Data                                                */
/* ------------------------------------------------------------------ */

const SKIN: Part[] = [
  { n:'Head',          g:'sp', a:[0.105,32,32], p:[0,0.65,0],    c:'#deb896' },
  { n:'Neck',          g:'ca', a:[0.038,0.07,8,16], p:[0,0.52,0], c:'#deb896' },
  { n:'Upper Torso',   g:'ca', a:[0.07,0.22,8,16], p:[0,0.33,0], s:[2.1,1,1.3], c:'#deb896' },
  { n:'Lower Torso',   g:'ca', a:[0.065,0.16,8,16], p:[0,0.1,0], s:[1.9,1,1.2], c:'#deb896' },
  { n:'Pelvis',        g:'sp', a:[0.13,24,24], p:[0,-0.05,0],    s:[1,0.55,0.7], c:'#deb896' },
  { n:'L Shoulder',    g:'sp', a:[0.048,16,16], p:[-0.195,0.42,0], c:'#deb896' },
  { n:'R Shoulder',    g:'sp', a:[0.048,16,16], p:[0.195,0.42,0],  c:'#deb896' },
  { n:'L Upper Arm',   g:'ca', a:[0.038,0.22,8,16], p:[-0.21,0.26,0], c:'#deb896' },
  { n:'R Upper Arm',   g:'ca', a:[0.038,0.22,8,16], p:[0.21,0.26,0],  c:'#deb896' },
  { n:'L Forearm',     g:'ca', a:[0.032,0.21,8,16], p:[-0.21,0.01,0], c:'#deb896' },
  { n:'R Forearm',     g:'ca', a:[0.032,0.21,8,16], p:[0.21,0.01,0],  c:'#deb896' },
  { n:'L Hand',        g:'bx', a:[0.035,0.065,0.018], p:[-0.21,-0.14,0], c:'#deb896' },
  { n:'R Hand',        g:'bx', a:[0.035,0.065,0.018], p:[0.21,-0.14,0],  c:'#deb896' },
  { n:'L Upper Leg',   g:'ca', a:[0.058,0.32,8,16], p:[-0.08,-0.28,0], c:'#deb896' },
  { n:'R Upper Leg',   g:'ca', a:[0.058,0.32,8,16], p:[0.08,-0.28,0],  c:'#deb896' },
  { n:'L Lower Leg',   g:'ca', a:[0.042,0.33,8,16], p:[-0.08,-0.63,0], c:'#deb896' },
  { n:'R Lower Leg',   g:'ca', a:[0.042,0.33,8,16], p:[0.08,-0.63,0],  c:'#deb896' },
  { n:'L Foot',        g:'bx', a:[0.045,0.028,0.095], p:[-0.08,-0.84,0.02], c:'#deb896' },
  { n:'R Foot',        g:'bx', a:[0.045,0.028,0.095], p:[0.08,-0.84,0.02],  c:'#deb896' },
];

const SKELETAL: Part[] = [
  // Skull
  { n:'Skull',         g:'sp', a:[0.09,24,24], p:[0,0.66,0],    c:'#f5f0e0', info:'Cranium — 22 bones (8 cranial + 14 facial). Protects brain, supports sensory organs. Sutures fuse by age 20-30.', region:'head' },
  { n:'Jaw',           g:'bx', a:[0.06,0.025,0.04], p:[0,0.575,0.02], c:'#ece5d0', info:'Mandibula — strongest facial bone, only movable skull bone. Holds lower dentition. TMJ is a synovial hinge joint.', region:'head' },
  { n:'Eye Socket L',  g:'sp', a:[0.018,12,12], p:[-0.035,0.67,0.07], c:'#333', region:'head' },
  { n:'Eye Socket R',  g:'sp', a:[0.018,12,12], p:[0.035,0.67,0.07],  c:'#333', region:'head' },
  // Spine
  ...Array.from({length:7},(_,i)=>({
    n:`C${i+1}`, g:'cy' as const, a:[0.015,0.015,0.018,8], p:[0,0.50-i*0.018,0] as [number,number,number], c:'#f5f0e0', info:`Cervical vertebra C${i+1}`, region:'neck' as string,
  })),
  ...Array.from({length:12},(_,i)=>({
    n:`T${i+1}`, g:'cy' as const, a:[0.017,0.017,0.02,8], p:[0,0.37-i*0.022,0] as [number,number,number], c:'#f5f0e0', info:`Thoracic vertebra T${i+1}`, region:'back' as string,
  })),
  ...Array.from({length:5},(_,i)=>({
    n:`L${i+1}`, g:'cy' as const, a:[0.019,0.019,0.024,8], p:[0,0.1-i*0.026,0] as [number,number,number], c:'#f5f0e0', info:`Lumbar vertebra L${i+1}`, region:'back' as string,
  })),
  { n:'Sacrum',        g:'ca', a:[0.025,0.045,4,8], p:[0,-0.05,0], c:'#ece5d0', info:'Sacrum — base of spine', region:'pelvis' },
  // Sternum
  { n:'Sternum',       g:'bx', a:[0.02,0.14,0.012], p:[0,0.33,0.065], c:'#f5f0e0', info:'Sternum — breastbone', region:'chest' },
  // Clavicles
  { n:'L Clavicle',    g:'cy', a:[0.008,0.008,0.14,8], p:[-0.09,0.43,0.03], r:[0,0,0.3], c:'#f5f0e0', info:'Left clavicle', region:'chest' },
  { n:'R Clavicle',    g:'cy', a:[0.008,0.008,0.14,8], p:[0.09,0.43,0.03],  r:[0,0,-0.3], c:'#f5f0e0', info:'Right clavicle', region:'chest' },
  // Ribs (12 pairs simplified)
  ...Array.from({length:12},(_,i)=>[
    { n:`L Rib ${i+1}`, g:'cy' as const, a:[0.005,0.005,0.08+Math.min(i,6)*0.012,8], p:[-0.06-Math.min(i,6)*0.006, 0.38-i*0.022, 0.03] as [number,number,number], r:[0.3,0.4,0.6+i*0.02] as [number,number,number], c:'#f5f0e0', info:`Rib ${i+1} (left)`, region:'chest' as string },
    { n:`R Rib ${i+1}`, g:'cy' as const, a:[0.005,0.005,0.08+Math.min(i,6)*0.012,8], p:[0.06+Math.min(i,6)*0.006, 0.38-i*0.022, 0.03] as [number,number,number], r:[0.3,-0.4,-0.6-i*0.02] as [number,number,number], c:'#f5f0e0', info:`Rib ${i+1} (right)`, region:'chest' as string },
  ]).flat(),
  // Scapulae
  { n:'L Scapula',     g:'bx', a:[0.06,0.08,0.008], p:[-0.1,0.37,-0.04], r:[0,0.15,0], c:'#ece5d0', info:'Left scapula', region:'back' },
  { n:'R Scapula',     g:'bx', a:[0.06,0.08,0.008], p:[0.1,0.37,-0.04],  r:[0,-0.15,0], c:'#ece5d0', info:'Right scapula', region:'back' },
  // Pelvis
  { n:'L Ilium',       g:'sp', a:[0.08,16,16], p:[-0.06,-0.05,0], s:[1,0.5,0.6], c:'#f5f0e0', info:'Left ilium (pelvis)', region:'pelvis' },
  { n:'R Ilium',       g:'sp', a:[0.08,16,16], p:[0.06,-0.05,0],  s:[1,0.5,0.6], c:'#f5f0e0', info:'Right ilium (pelvis)', region:'pelvis' },
  // Arm bones
  { n:'L Humerus',     g:'cy', a:[0.012,0.012,0.24,8], p:[-0.21,0.26,0], c:'#f5f0e0', info:'Left humerus', region:'upper_limb' },
  { n:'R Humerus',     g:'cy', a:[0.012,0.012,0.24,8], p:[0.21,0.26,0],  c:'#f5f0e0', info:'Right humerus', region:'upper_limb' },
  { n:'L Radius',      g:'cy', a:[0.009,0.009,0.2,8], p:[-0.2,0.01,0.01], c:'#f5f0e0', info:'Left radius', region:'upper_limb' },
  { n:'R Radius',      g:'cy', a:[0.009,0.009,0.2,8], p:[0.2,0.01,0.01],  c:'#f5f0e0', info:'Right radius', region:'upper_limb' },
  { n:'L Ulna',        g:'cy', a:[0.009,0.009,0.21,8], p:[-0.22,0.01,-0.01], c:'#f5f0e0', info:'Left ulna', region:'upper_limb' },
  { n:'R Ulna',        g:'cy', a:[0.009,0.009,0.21,8], p:[0.22,0.01,-0.01],  c:'#f5f0e0', info:'Right ulna', region:'upper_limb' },
  // Leg bones
  { n:'L Femur',       g:'cy', a:[0.016,0.016,0.34,8], p:[-0.08,-0.28,0], c:'#f5f0e0', info:'Left femur — longest bone', region:'lower_limb' },
  { n:'R Femur',       g:'cy', a:[0.016,0.016,0.34,8], p:[0.08,-0.28,0],  c:'#f5f0e0', info:'Right femur — longest bone', region:'lower_limb' },
  { n:'L Patella',     g:'sp', a:[0.015,12,12], p:[-0.08,-0.46,0.03], c:'#f5f0e0', info:'Left patella (kneecap)', region:'lower_limb' },
  { n:'R Patella',     g:'sp', a:[0.015,12,12], p:[0.08,-0.46,0.03],  c:'#f5f0e0', info:'Right patella (kneecap)', region:'lower_limb' },
  { n:'L Tibia',       g:'cy', a:[0.013,0.013,0.32,8], p:[-0.08,-0.63,0.01], c:'#f5f0e0', info:'Left tibia', region:'lower_limb' },
  { n:'R Tibia',       g:'cy', a:[0.013,0.013,0.32,8], p:[0.08,-0.63,0.01],  c:'#f5f0e0', info:'Right tibia', region:'lower_limb' },
  { n:'L Fibula',      g:'cy', a:[0.007,0.007,0.3,8], p:[-0.1,-0.63,-0.01], c:'#f5f0e0', info:'Left fibula', region:'lower_limb' },
  { n:'R Fibula',      g:'cy', a:[0.007,0.007,0.3,8], p:[0.1,-0.63,-0.01],  c:'#f5f0e0', info:'Right fibula', region:'lower_limb' },
];

const ORGANS: Part[] = [
  { n:'Brain',         g:'sp', a:[0.075,24,24], p:[0,0.68,0],    s:[1,0.85,0.95], c:'#d4a0a0', info:'Cerebrum (Telencephalon) — cognitive processing, 86 billion neurons. The largest part of the brain, responsible for thought, memory, language and consciousness.', region:'head' },
  { n:'Cerebellum',    g:'sp', a:[0.035,16,16], p:[0,0.62,-0.04], c:'#c09090', info:'Cerebellum — coordination, balance and motor learning. Contains more neurons than the rest of the brain combined.', region:'head' },
  { n:'Thyroid',       g:'sp', a:[0.02,12,12],  p:[0,0.49,0.03],  s:[1.8,0.8,0.5], c:'#cc6677', info:'Glandula thyroidea — butterfly-shaped endocrine gland. Produces T3/T4 hormones regulating metabolism, growth and development.', region:'neck' },
  { n:'Trachea',       g:'cy', a:[0.012,0.012,0.12,12], p:[0,0.44,0.03], c:'#cc9999', info:'Trachea — 10-12cm cartilaginous airway connecting larynx to bronchi. C-shaped rings maintain patency.', region:'neck' },
  { n:'L Lung',        g:'sp', a:[0.065,20,20], p:[-0.065,0.33,0.01], s:[0.85,1.3,0.8], c:'#cc8899', info:'Pulmo sinister — left lung, 2 lobes (superior/inferior). ~480 million alveoli for gas exchange. Smaller than right due to cardiac notch.', region:'chest' },
  { n:'R Lung',        g:'sp', a:[0.07,20,20],  p:[0.06,0.33,0.01],  s:[0.9,1.3,0.8], c:'#cc8899', info:'Pulmo dexter — right lung, 3 lobes (superior/middle/inferior). Slightly larger, handles 55% of respiratory function.', region:'chest' },
  { n:'Heart',         g:'sp', a:[0.045,20,20], p:[-0.02,0.3,0.035], s:[1,1.1,0.85], c:'#cc2244', info:'Cor — muscular pump, ~300g. 4 chambers, pumps ~5L blood/min at rest, ~100,000 beats/day. Supplied by left and right coronary arteries.', region:'chest' },
  { n:'L Atrium',      g:'sp', a:[0.022,12,12], p:[-0.035,0.33,0.03], c:'#991133', info:'Atrium sinistrum — receives oxygenated blood from 4 pulmonary veins. Thin-walled, low pressure chamber.', region:'chest' },
  { n:'R Atrium',      g:'sp', a:[0.022,12,12], p:[0.005,0.33,0.03],  c:'#991133', info:'Atrium dextrum — receives systemic venous blood from SVC and IVC. Contains SA node (pacemaker).', region:'chest' },
  { n:'Aortic Arch',   g:'cy', a:[0.008,0.008,0.04,12], p:[-0.01,0.36,0.035], r:[0,0,0.5], c:'#cc1122', info:'Arcus aortae — gives rise to brachiocephalic trunk, left common carotid and left subclavian arteries.', region:'chest' },
  { n:'Liver',         g:'sp', a:[0.07,20,20], p:[0.04,0.19,0.02], s:[1.3,0.7,0.65], c:'#8b3a2a', info:'Hepar — largest internal organ (~1.5kg). 500+ metabolic functions including detoxification, bile synthesis, glycogen storage, protein production.', region:'abdomen' },
  { n:'Stomach',       g:'sp', a:[0.045,20,20], p:[-0.04,0.17,0.025], s:[1,1.2,0.7], c:'#cc8866', info:'Gaster (Ventriculus) — J-shaped muscular organ. Secretes HCl (pH 1.5-3.5) and pepsin. Capacity 1-1.5L. 4 regions: cardia, fundus, body, pylorus.', region:'abdomen' },
  { n:'Spleen',        g:'sp', a:[0.03,16,16], p:[-0.1,0.19,0],  s:[1,1.3,0.6], c:'#884455', info:'Lien (Splen) — largest lymphoid organ. Filters blood, recycles iron from old erythrocytes, stores platelets and monocytes.', region:'abdomen' },
  { n:'Gallbladder',   g:'sp', a:[0.015,12,12], p:[0.07,0.17,0.04], s:[0.6,1.2,0.5], c:'#669944', info:'Vesica biliaris (Vesica fellea) — stores and concentrates bile (30-50mL). Releases via cystic duct into common bile duct.', region:'abdomen' },
  { n:'Pancreas',      g:'ca', a:[0.012,0.07,6,12], p:[0,0.14,0.02], r:[0,0,0.15], c:'#ccaa77', info:'Pancreas — dual function: exocrine (digestive enzymes, 1.5L/day) and endocrine (islets of Langerhans produce insulin, glucagon).', region:'abdomen' },
  { n:'L Kidney',      g:'sp', a:[0.028,16,16], p:[-0.065,0.12,-0.02], s:[0.6,1,0.5], c:'#993333', info:'Ren sinister — bean-shaped, ~150g. Contains ~1 million nephrons. Filters 180L blood/day, produces 1-2L urine. Regulates electrolytes, pH, blood pressure.', region:'back' },
  { n:'R Kidney',      g:'sp', a:[0.028,16,16], p:[0.065,0.12,-0.02],  s:[0.6,1,0.5], c:'#993333', info:'Ren dexter — slightly lower than left (displaced by liver). Same function: filtration, reabsorption, secretion, excretion.', region:'back' },
  { n:'L Adrenal',     g:'sp', a:[0.012,10,10], p:[-0.065,0.16,-0.02], s:[1,0.5,0.4], c:'#bbaa44', info:'Glandula suprarenalis sinistra — cortex produces cortisol, aldosterone, androgens. Medulla produces epinephrine and norepinephrine.', region:'back' },
  { n:'R Adrenal',     g:'sp', a:[0.012,10,10], p:[0.065,0.16,-0.02],  s:[1,0.5,0.4], c:'#bbaa44', info:'Glandula suprarenalis dextra — triangular shape. Essential for stress response, metabolism, immune regulation and blood pressure.', region:'back' },
  { n:'Sm Intestine',  g:'sp', a:[0.065,20,20], p:[0,0.01,0.02],  s:[1,0.9,0.5], c:'#cc9988', info:'Intestinum tenue — 6-7m long. Three parts: duodenum, jejunum, ileum. Primary site of nutrient absorption via villi (surface area ~32m²).', region:'abdomen' },
  { n:'Lg Intestine',  g:'sp', a:[0.085,20,20], p:[0,0.03,0.015], s:[1,0.8,0.4], c:'#bb8877', info:'Intestinum crassum — 1.5m colon. Ascending, transverse, descending, sigmoid. Water/electrolyte absorption, bacterial fermentation, feces formation.', region:'abdomen' },
  { n:'Bladder',       g:'sp', a:[0.025,16,16], p:[0,-0.1,0.03],  s:[1,0.8,0.7], c:'#ccaa55', info:'Vesica urinaria — muscular reservoir, capacity 400-600mL. Detrusor muscle contracts for micturition. Lined by transitional epithelium.', region:'pelvis' },
  { n:'Appendix',      g:'ca', a:[0.006,0.02,4,8], p:[0.07,-0.04,0.03], r:[0.3,0,0.8], c:'#cc8877', info:'Appendix vermiformis — 5-10cm blind-ended tube at cecum. Gut-associated lymphoid tissue (GALT), immune function.', region:'abdomen' },
  { n:'Diaphragm',     g:'cy', a:[0.12,0.12,0.008,20], p:[0,0.23,0.01], c:'#cc7766', info:'Diaphragma — dome-shaped musculotendinous partition. Primary respiratory muscle. Innervated by phrenic nerve (C3-C5).', region:'chest' },
];

const MUSCULAR: Part[] = [
  { n:'L Pectoralis Major',  g:'bx', a:[0.06,0.07,0.025], p:[-0.065,0.37,0.05], r:[0,0.1,0], c:'#cc3344', info:'Musculus pectoralis major — large fan-shaped muscle. Origin: clavicle, sternum, ribs 1-6. Insertion: humerus. Actions: flexion, adduction, internal rotation of arm.', region:'chest' },
  { n:'R Pectoralis Major',  g:'bx', a:[0.06,0.07,0.025], p:[0.065,0.37,0.05],  r:[0,-0.1,0], c:'#cc3344', info:'Musculus pectoralis major — large fan-shaped muscle. Origin: clavicle, sternum, ribs 1-6. Insertion: humerus. Actions: flexion, adduction, internal rotation of arm.', region:'chest' },
  { n:'L Deltoid',     g:'sp', a:[0.04,16,16], p:[-0.195,0.42,0], s:[1,1.2,0.8], c:'#cc4455', info:'Musculus deltoideus — 3 parts (anterior, lateral, posterior). Primary shoulder abductor. Innervated by axillary nerve (C5-C6).', region:'upper_limb' },
  { n:'R Deltoid',     g:'sp', a:[0.04,16,16], p:[0.195,0.42,0],  s:[1,1.2,0.8], c:'#cc4455', info:'Musculus deltoideus — 3 parts (anterior, lateral, posterior). Primary shoulder abductor. Innervated by axillary nerve (C5-C6).', region:'upper_limb' },
  { n:'L Biceps Brachii', g:'ca', a:[0.03,0.12,6,12], p:[-0.21,0.28,0.015], c:'#cc3344', info:'Musculus biceps brachii — 2 heads (long, short). Forearm flexion and supination. Innervated by musculocutaneous nerve (C5-C6).', region:'upper_limb' },
  { n:'R Biceps Brachii', g:'ca', a:[0.03,0.12,6,12], p:[0.21,0.28,0.015],  c:'#cc3344', info:'Musculus biceps brachii — 2 heads (long, short). Forearm flexion and supination. Innervated by musculocutaneous nerve (C5-C6).', region:'upper_limb' },
  { n:'L Triceps Brachii', g:'ca', a:[0.028,0.12,6,12], p:[-0.21,0.28,-0.015], c:'#bb2233', info:'Musculus triceps brachii — 3 heads (long, lateral, medial). Primary forearm extensor. Innervated by radial nerve (C6-C8).', region:'upper_limb' },
  { n:'R Triceps Brachii', g:'ca', a:[0.028,0.12,6,12], p:[0.21,0.28,-0.015],  c:'#bb2233', info:'Musculus triceps brachii — 3 heads (long, lateral, medial). Primary forearm extensor. Innervated by radial nerve (C6-C8).', region:'upper_limb' },
  { n:'Rectus Abdominis', g:'bx', a:[0.055,0.16,0.02], p:[0,0.12,0.055], c:'#cc3344', info:'Musculus rectus abdominis — paired strap muscle, divided by tendinous intersections. Trunk flexion, compression of abdominal contents.', region:'abdomen' },
  { n:'L Oblique',     g:'bx', a:[0.04,0.12,0.015], p:[-0.1,0.12,0.04], r:[0,0.3,0], c:'#bb2233', info:'External oblique — trunk rotation', region:'abdomen' },
  { n:'R Oblique',     g:'bx', a:[0.04,0.12,0.015], p:[0.1,0.12,0.04],  r:[0,-0.3,0], c:'#bb2233', info:'External oblique — trunk rotation', region:'abdomen' },
  { n:'L Trapezius',   g:'bx', a:[0.07,0.1,0.012], p:[-0.06,0.4,-0.04], r:[0.15,0,0], c:'#bb3344', info:'Trapezius — scapula movement', region:'back' },
  { n:'R Trapezius',   g:'bx', a:[0.07,0.1,0.012], p:[0.06,0.4,-0.04],  r:[0.15,0,0], c:'#bb3344', info:'Trapezius — scapula movement', region:'back' },
  { n:'L Lat. Dorsi',  g:'bx', a:[0.06,0.12,0.012], p:[-0.08,0.26,-0.04], c:'#aa2233', info:'Latissimus dorsi — arm extension', region:'back' },
  { n:'R Lat. Dorsi',  g:'bx', a:[0.06,0.12,0.012], p:[0.08,0.26,-0.04],  c:'#aa2233', info:'Latissimus dorsi — arm extension', region:'back' },
  { n:'L Gluteus',     g:'sp', a:[0.055,16,16], p:[-0.06,-0.1,-0.03], s:[1,0.8,0.7], c:'#cc3344', info:'Gluteus maximus — hip extension', region:'pelvis' },
  { n:'R Gluteus',     g:'sp', a:[0.055,16,16], p:[0.06,-0.1,-0.03],  s:[1,0.8,0.7], c:'#cc3344', info:'Gluteus maximus — hip extension', region:'pelvis' },
  { n:'L Quadriceps',  g:'ca', a:[0.045,0.2,6,12], p:[-0.08,-0.28,0.02], c:'#cc3344', info:'Quadriceps — knee extension', region:'lower_limb' },
  { n:'R Quadriceps',  g:'ca', a:[0.045,0.2,6,12], p:[0.08,-0.28,0.02],  c:'#cc3344', info:'Quadriceps — knee extension', region:'lower_limb' },
  { n:'L Hamstring',   g:'ca', a:[0.04,0.18,6,12], p:[-0.08,-0.3,-0.02], c:'#bb2233', info:'Hamstrings — knee flexion', region:'lower_limb' },
  { n:'R Hamstring',   g:'ca', a:[0.04,0.18,6,12], p:[0.08,-0.3,-0.02],  c:'#bb2233', info:'Hamstrings — knee flexion', region:'lower_limb' },
  { n:'L Gastrocnemius',g:'ca', a:[0.035,0.14,6,12], p:[-0.08,-0.58,-0.015], c:'#cc3344', info:'Gastrocnemius — ankle plantarflexion', region:'lower_limb' },
  { n:'R Gastrocnemius',g:'ca', a:[0.035,0.14,6,12], p:[0.08,-0.58,-0.015],  c:'#cc3344', info:'Gastrocnemius — ankle plantarflexion', region:'lower_limb' },
];

// Vascular system as tube paths
const VASCULAR_LINES: LinePart[] = [
  { n:'Aorta', pts:[[0,0.34,0.035],[0,0.3,0.04],[-0.01,0.2,0.03],[-0.01,0.1,0.02],[-0.01,0,0.01],[-0.01,-0.08,0]], c:'#cc1100', info:'Aorta — largest artery' },
  { n:'L Carotid', pts:[[0,0.42,0.03],[-0.03,0.5,0.03],[-0.03,0.6,0.02]], c:'#cc2200', info:'Left carotid artery — blood to brain' },
  { n:'R Carotid', pts:[[0,0.42,0.03],[0.03,0.5,0.03],[0.03,0.6,0.02]], c:'#cc2200', info:'Right carotid artery — blood to brain' },
  { n:'L Subclavian', pts:[[-0.02,0.42,0.03],[-0.1,0.42,0.02],[-0.21,0.38,0.01]], c:'#cc2200', info:'Left subclavian artery' },
  { n:'R Subclavian', pts:[[0.02,0.42,0.03],[0.1,0.42,0.02],[0.21,0.38,0.01]], c:'#cc2200', info:'Right subclavian artery' },
  { n:'L Brachial', pts:[[-0.21,0.38,0.01],[-0.21,0.26,0.01],[-0.21,0.1,0.01]], c:'#cc3322', info:'Left brachial artery' },
  { n:'R Brachial', pts:[[0.21,0.38,0.01],[0.21,0.26,0.01],[0.21,0.1,0.01]], c:'#cc3322', info:'Right brachial artery' },
  { n:'L Iliac', pts:[[-0.01,-0.08,0],[-0.04,-0.12,0],[-0.08,-0.18,0.01]], c:'#cc2200', info:'Left iliac artery' },
  { n:'R Iliac', pts:[[-0.01,-0.08,0],[0.04,-0.12,0],[0.08,-0.18,0.01]], c:'#cc2200', info:'Right iliac artery' },
  { n:'L Femoral', pts:[[-0.08,-0.18,0.01],[-0.08,-0.35,0.015],[-0.08,-0.5,0.01]], c:'#cc3322', info:'Left femoral artery' },
  { n:'R Femoral', pts:[[0.08,-0.18,0.01],[0.08,-0.35,0.015],[0.08,-0.5,0.01]], c:'#cc3322', info:'Right femoral artery' },
  // Veins (blue)
  { n:'IVC', pts:[[0.015,0.3,0.025],[0.015,0.2,0.02],[0.015,0.1,0.015],[0.015,0,0.005],[0.015,-0.08,-0.005]], c:'#2244aa', info:'Inferior vena cava' },
  { n:'SVC', pts:[[0.015,0.3,0.025],[0.015,0.38,0.025],[0.015,0.44,0.025]], c:'#2244aa', info:'Superior vena cava' },
  { n:'L Jugular', pts:[[-0.04,0.44,0.02],[-0.04,0.52,0.02],[-0.03,0.58,0.015]], c:'#3355bb', info:'Left jugular vein' },
  { n:'R Jugular', pts:[[0.04,0.44,0.02],[0.04,0.52,0.02],[0.03,0.58,0.015]], c:'#3355bb', info:'Right jugular vein' },
];

const NERVOUS_LINES: LinePart[] = [
  { n:'Spinal Cord', pts:[[0,0.6,-0.01],[0,0.5,-0.01],[0,0.35,-0.01],[0,0.2,-0.01],[0,0.05,-0.01],[0,-0.05,-0.01]], c:'#ffd700', info:'Spinal cord — central nervous system' },
  { n:'L Brachial Plexus', pts:[[0,0.42,-0.01],[-0.08,0.42,0],[-0.15,0.4,0],[-0.21,0.35,0]], c:'#eec800', info:'Left brachial plexus — arm innervation' },
  { n:'R Brachial Plexus', pts:[[0,0.42,-0.01],[0.08,0.42,0],[0.15,0.4,0],[0.21,0.35,0]], c:'#eec800', info:'Right brachial plexus — arm innervation' },
  { n:'L Sciatic', pts:[[0,-0.05,-0.02],[-0.05,-0.12,-0.02],[-0.08,-0.25,-0.02],[-0.08,-0.45,-0.015],[-0.08,-0.65,-0.01]], c:'#eec800', info:'Left sciatic nerve — largest nerve' },
  { n:'R Sciatic', pts:[[0,-0.05,-0.02],[0.05,-0.12,-0.02],[0.08,-0.25,-0.02],[0.08,-0.45,-0.015],[0.08,-0.65,-0.01]], c:'#eec800', info:'Right sciatic nerve — largest nerve' },
  { n:'L Ulnar', pts:[[-0.21,0.35,0],[-0.21,0.2,-0.005],[-0.21,0.05,-0.005],[-0.21,-0.08,-0.005]], c:'#ddbb00', info:'Left ulnar nerve — "funny bone" nerve' },
  { n:'R Ulnar', pts:[[0.21,0.35,0],[0.21,0.2,-0.005],[0.21,0.05,-0.005],[0.21,-0.08,-0.005]], c:'#ddbb00', info:'Right ulnar nerve' },
  { n:'L Femoral Nerve', pts:[[0,0,-0.01],[-0.04,-0.05,0.01],[-0.08,-0.15,0.015],[-0.08,-0.35,0.01]], c:'#ddbb00', info:'Left femoral nerve — thigh innervation' },
  { n:'R Femoral Nerve', pts:[[0,0,-0.01],[0.04,-0.05,0.01],[0.08,-0.15,0.015],[0.08,-0.35,0.01]], c:'#ddbb00', info:'Right femoral nerve — thigh innervation' },
  ...Array.from({length:6},(_,i)=>[
    { n:`L Intercostal ${i+1}`, pts:[[0,0.36-i*0.03,-0.01],[-0.06,0.36-i*0.03,0.02],[-0.1,0.35-i*0.03,0.03]] as [number,number,number][], c:'#ddcc44' as string, info:`Intercostal nerve ${i+1}` },
    { n:`R Intercostal ${i+1}`, pts:[[0,0.36-i*0.03,-0.01],[0.06,0.36-i*0.03,0.02],[0.1,0.35-i*0.03,0.03]] as [number,number,number][], c:'#ddcc44' as string, info:`Intercostal nerve ${i+1}` },
  ]).flat(),
];

/* ------------------------------------------------------------------ */
/*  Geometry Helper                                                    */
/* ------------------------------------------------------------------ */
function PartMesh({ part, material, onClick, onHover }: { part: Part; material: JSX.Element; onClick?: () => void; onHover?: (name: string | null) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  return (
    <mesh
      ref={ref}
      position={part.p}
      rotation={part.r ? new THREE.Euler(...part.r) : undefined}
      scale={part.s}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover?.(part.n); if(ref.current) ref.current.scale.multiplyScalar(1.05); }}
      onPointerOut={(e) => { e.stopPropagation(); onHover?.(null); if(ref.current && part.s) ref.current.scale.set(...part.s); else if(ref.current) ref.current.scale.set(1,1,1); }}
    >
      {part.g === 'sp' && <sphereGeometry args={part.a as [number,number,number]} />}
      {part.g === 'ca' && <capsuleGeometry args={part.a as [number,number,number,number]} />}
      {part.g === 'cy' && <cylinderGeometry args={part.a as [number,number,number,number]} />}
      {part.g === 'bx' && <boxGeometry args={part.a as [number,number,number]} />}
      {material}
    </mesh>
  );
}

function TubeLine({ line, opacity }: { line: LinePart; opacity: number }) {
  const geo = useMemo(() => {
    const pts = line.pts.map(p => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 20, 0.004, 6, false);
  }, [line.pts]);

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={line.c} transparent opacity={opacity} emissive={line.c} emissiveIntensity={0.3} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Layer Components                                                   */
/* ------------------------------------------------------------------ */
function SkinLayer({ opacity, onSelect, onHover }: { opacity: number; onSelect: (p: Part) => void; onHover: (n: string|null) => void }) {
  return <group>
    {SKIN.map(p => (
      <PartMesh key={p.n} part={p} onClick={() => onSelect(p)} onHover={onHover}
        material={<meshPhysicalMaterial color={p.c} transparent opacity={opacity * 0.28} roughness={0.35} transmission={0.6} thickness={0.4} clearcoat={0.2} clearcoatRoughness={0.3} side={THREE.DoubleSide} ior={1.4} />}
      />
    ))}
  </group>;
}

function SkeletalLayer({ opacity, onSelect, onHover }: { opacity: number; onSelect: (p: Part) => void; onHover: (n: string|null) => void }) {
  return <group>
    {SKELETAL.map(p => (
      <PartMesh key={p.n} part={p} onClick={() => onSelect(p)} onHover={onHover}
        material={<meshStandardMaterial color={p.c} transparent opacity={opacity} roughness={0.6} metalness={0.05} />}
      />
    ))}
  </group>;
}

function OrgansLayer({ opacity, onSelect, onHover }: { opacity: number; onSelect: (p: Part) => void; onHover: (n: string|null) => void }) {
  return <group>
    {ORGANS.map(p => (
      <PartMesh key={p.n} part={p} onClick={() => onSelect(p)} onHover={onHover}
        material={<meshPhysicalMaterial color={p.c} transparent opacity={opacity * 0.9} roughness={0.45} metalness={0.05} clearcoat={0.3} clearcoatRoughness={0.2} />}
      />
    ))}
  </group>;
}

function MuscularLayer({ opacity, onSelect, onHover }: { opacity: number; onSelect: (p: Part) => void; onHover: (n: string|null) => void }) {
  return <group>
    {MUSCULAR.map(p => (
      <PartMesh key={p.n} part={p} onClick={() => onSelect(p)} onHover={onHover}
        material={<meshStandardMaterial color={p.c} transparent opacity={opacity * 0.85} roughness={0.5} metalness={0.05} />}
      />
    ))}
  </group>;
}

function VascularLayer({ opacity }: { opacity: number }) {
  return <group>
    {VASCULAR_LINES.map(l => <TubeLine key={l.n} line={l} opacity={opacity} />)}
  </group>;
}

function NervousLayer({ opacity }: { opacity: number }) {
  return <group>
    {NERVOUS_LINES.map(l => <TubeLine key={l.n} line={l} opacity={opacity} />)}
  </group>;
}

/* ------------------------------------------------------------------ */
/*  Slow Rotation                                                      */
/* ------------------------------------------------------------------ */
function AutoRotate({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const angle = useRef(0);
  useFrame((_, delta) => {
    if (!enabled) return;
    angle.current += delta * 0.15;
    const r = 2.5;
    camera.position.x = Math.sin(angle.current) * r;
    camera.position.z = Math.cos(angle.current) * r;
    camera.lookAt(0, 0.1, 0);
  });
  return null;
}

/* ------------------------------------------------------------------ */
/*  Main Viewer                                                        */
/* ------------------------------------------------------------------ */
export interface AnatomyViewer3DProps {
  onSelectRegion?: (region: string, info: string) => void;
  className?: string;
}

export default function AnatomyViewer3D({ onSelectRegion, className }: AnatomyViewer3DProps) {
  const [activeLayers, setActiveLayers] = useState<Set<LayerId>>(new Set(['skin', 'skeletal', 'organs', 'vascular']));
  const [selected, setSelected] = useState<Part | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<string>('front');

  const toggleLayer = useCallback((id: LayerId) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback((p: Part) => {
    setSelected(p);
    setAutoRotate(false);
    if (p.region && p.info && onSelectRegion) onSelectRegion(p.region, p.info);
  }, [onSelectRegion]);

  const layerOpacity = useCallback((id: LayerId) => activeLayers.has(id) ? 1 : 0, [activeLayers]);

  const PRESETS: Record<string, [number,number,number]> = {
    front: [0, 0.1, 2.5],
    back: [0, 0.1, -2.5],
    left: [-2.5, 0.1, 0],
    right: [2.5, 0.1, 0],
    top: [0, 2.8, 0.01],
  };

  return (
    <div className={`relative w-full h-full min-h-[500px] ${className || ''}`}>
      <Canvas
        camera={{ position: [0, 0.1, 2.5], fov: 42 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        onPointerDown={() => setAutoRotate(false)}
      >
        <color attach="background" args={['#050b15']} />
        <fog attach="fog" args={['#050b15', 3.5, 7]} />

        <ambientLight intensity={0.3} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} color="#fff5ee" castShadow />
        <directionalLight position={[-2, 3, -2]} intensity={0.4} color="#e0e8ff" />
        <pointLight position={[-2, 1.5, 2.5]} intensity={0.6} color="#10b981" distance={6} />
        <pointLight position={[2, -0.5, -1.5]} intensity={0.4} color="#06b6d4" distance={5} />
        <pointLight position={[0, 2.5, 0.5]} intensity={0.25} color="#8b5cf6" distance={4} />
        <pointLight position={[0, -1, 2]} intensity={0.15} color="#f59e0b" distance={3} />

        <AutoRotate enabled={autoRotate} />

        <group position={[0, -0.1, 0]}>
          {activeLayers.has('skin') && <SkinLayer opacity={layerOpacity('skin')} onSelect={handleSelect} onHover={setHovered} />}
          {activeLayers.has('skeletal') && <SkeletalLayer opacity={layerOpacity('skeletal')} onSelect={handleSelect} onHover={setHovered} />}
          {activeLayers.has('organs') && <OrgansLayer opacity={layerOpacity('organs')} onSelect={handleSelect} onHover={setHovered} />}
          {activeLayers.has('muscular') && <MuscularLayer opacity={layerOpacity('muscular')} onSelect={handleSelect} onHover={setHovered} />}
          {activeLayers.has('vascular') && <VascularLayer opacity={layerOpacity('vascular')} />}
          {activeLayers.has('nervous') && <NervousLayer opacity={layerOpacity('nervous')} />}
        </group>

        <OrbitControls
          enablePan={false}
          minDistance={1.2}
          maxDistance={5}
          target={[0, 0.1, 0]}
          enableDamping
          dampingFactor={0.08}
        />

        {/* Bloom effect removed for compatibility */}
      </Canvas>

      {/* Hover Label */}
      {hovered && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#0a1628]/90 backdrop-blur-xl rounded-lg border border-emerald-500/20 shadow-lg shadow-emerald-500/5 pointer-events-none z-10">
          <div className="text-[12px] font-semibold text-white">{hovered}</div>
          <div className="text-[9px] text-emerald-400/60 mt-0.5">Click to view details</div>
        </div>
      )}

      {/* Layer Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
        {(Object.entries(LAYER_META) as [LayerId, typeof LAYER_META[LayerId]][]).map(([id, meta]) => (
          <button key={id} onClick={() => toggleLayer(id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
              activeLayers.has(id)
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-black/40 border-white/5 text-white/40 hover:text-white/60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: activeLayers.has(id) ? meta.color : '#333' }} />
            {meta.label}
          </button>
        ))}
      </div>

      {/* Camera Presets */}
      <div className="absolute bottom-4 left-4 flex gap-1.5 z-10">
        {Object.keys(PRESETS).map(k => (
          <button key={k} onClick={() => { setCameraPreset(k); setAutoRotate(false); }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider border transition-all ${
              cameraPreset === k ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-black/40 border-white/5 text-white/40 hover:text-white/60'
            }`}
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

      {/* Selected Part Info Panel — Complete Anatomy style */}
      {selected && (
        <div className="absolute top-4 right-4 w-72 bg-[#0a1628]/95 backdrop-blur-xl rounded-xl border border-white/[0.08] shadow-2xl shadow-black/50 z-20 overflow-hidden">
          {/* Header breadcrumb */}
          <div className="px-4 pt-3 pb-2 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[9px] text-white/30 uppercase tracking-wider">
                {selected.region && <><span className="text-emerald-400/50">{selected.region}</span><span>›</span></>}
                <span className="text-white/50">{selected.n}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-all">✕</button>
            </div>
            <h3 className="text-[14px] font-bold text-white mt-1 leading-tight">{selected.n}</h3>
          </div>

          {/* Tabs row */}
          <div className="flex border-b border-white/[0.06] text-[10px]">
            <div className="px-4 py-2 text-emerald-400 border-b border-emerald-400 font-semibold">Info</div>
            <div className="px-4 py-2 text-white/30">Clinical</div>
            <div className="px-4 py-2 text-white/30">Relations</div>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[300px] overflow-y-auto">
            {selected.info && (
              <div className="mb-3">
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Structure / Morphology</h4>
                <p className="text-[11px] text-white/70 leading-[1.6]">{selected.info}</p>
              </div>
            )}
            {selected.region && (
              <div>
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Anatomical Region</h4>
                <span className="text-[10px] text-emerald-400/80 px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/10 inline-block">
                  {selected.region.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="absolute bottom-4 right-4 text-[9px] text-white/25 z-10 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
        {SKIN.length + SKELETAL.length + ORGANS.length + MUSCULAR.length + VASCULAR_LINES.length + NERVOUS_LINES.length} interactive structures · 6 systems · WebGL
      </div>
    </div>
  );
}
