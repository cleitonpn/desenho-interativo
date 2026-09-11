// Disposable fixtures. This script refuses to target a real Firebase project.
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'
const {initializeApp}=await import('firebase-admin/app')
const {getFirestore}=await import('firebase-admin/firestore')
const {getAuth}=await import('firebase-admin/auth')
initializeApp({projectId:'demo-quintal'})
const db=getFirestore(),auth=getAuth(),email='vital@example.test',password='Quintal-Teste-2026!'
let user;try{user=await auth.getUserByEmail(email)}catch{user=await auth.createUser({email,password,emailVerified:true})}
await db.doc(`usuarios/${user.uid}`).set({admin:true,nome:'Vital (teste local)',email,whatsapp:'',cidade:'',nascimento:'',jaFezArte:false,emailVerificado:true,criadoEm:Date.now()})
await db.doc('gameRewards/demo5percent').set({name:'5% na próxima tattoo',description:'Demonstração local do benefício',terms:'Cupom de teste, sem validade comercial. Não cumulativo.',image:'',type:'percent',value:5,active:true,starts:0,ends:0,validityDays:30,stock:100,chance:100,perUser:10,cooldownDays:0,minBoxes:1,mission:'',issued:0,used:0})
console.log('Admin fictício e campanha criados exclusivamente em demo-quintal.')
