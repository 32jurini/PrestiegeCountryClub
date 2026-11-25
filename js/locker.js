// The clubhouse supports one local member per browser, including guest play before registration.
export const walletKey='prestiege-club-wallet-v1';
export const catalog=[
 {id:'custom',slot:'shirt',name:'Creator polo',price:0,color:null},
 {id:'white',slot:'ball',name:'Classic white',price:0,color:'#f9f9f3'},
 {id:'links',slot:'shirt',name:'Links pinstripe',price:70,pattern:'pinstripe'},
 {id:'marina',slot:'shirt',name:'Marina sailor stripe',price:50,pattern:'breton'},
 {id:'claret',slot:'shirt',name:'Club twin stripe',price:90,pattern:'twin'},
 {id:'pane',slot:'shirt',name:'Windowpane check',price:65,pattern:'windowpane'},
 {id:'argyle',slot:'shirt',name:'Highland argyle',price:100,pattern:'argyle'},
 {id:'dot',slot:'shirt',name:'Tour microdot',price:45,pattern:'dot'},
 {id:'tangerine',slot:'ball',name:'Tangerine',price:45,color:'#ff9d26'},
 {id:'violet',slot:'ball',name:'Orchid',price:55,color:'#d493ff'},
 {id:'lemon',slot:'ball',name:'Tour yellow',price:20,color:'#eaff35'},
 {id:'coral',slot:'ball',name:'Sunset coral',price:35,color:'#ff694b'},
 {id:'ice',slot:'ball',name:'Glacier blue',price:50,color:'#7adaff'}
];
export const itemById=id=>catalog.find(item=>item.id===id);
export function wallet(){
 const raw=localStorage.getItem(walletKey);
 const state=raw?JSON.parse(raw):{credits:0,owned:['custom','white'],equipped:{shirt:'custom',ball:'white'},rounds:{}};
 for(const slot of ['shirt','ball']){
  const choice=localStorage.getItem(walletKey+'-'+slot);
  if(state.owned.includes(choice)&&itemById(choice)?.slot===slot)state.equipped[slot]=choice;
 }
 return state;
}
function update(change){
 const commit=()=>{
  const state=wallet(),result=change(state);
  localStorage.setItem(walletKey,JSON.stringify(state));
  return result;
 };
 return navigator.locks?navigator.locks.request(walletKey,commit):Promise.resolve().then(commit);
}
export function award(round,hole,shots){
 if(!Number.isInteger(shots)||shots<1||!Number.isInteger(hole)||hole<0||hole>17||!round)throw Error('Invalid hole result');
 return update(state=>{
  const bit=1<<hole;
  if(state.rounds[round]&bit)return 0;
  const credits=[100,50,35][shots-1]??20;
  state.rounds[round]=(state.rounds[round]||0)|bit;
  state.credits+=credits;
  return credits;
 });
}
export function buy(id){
 return update(state=>{
  const item=itemById(id);
  if(!item||state.owned.includes(id))return false;
  if(state.credits<item.price)throw Error('Earn more credits on the course.');
  state.credits-=item.price;state.owned.push(id);return true;
 });
}
export function wear(id){
 const item=itemById(id);
 if(!item||!wallet().owned.includes(id))throw Error('Purchase this item first.');
 // A single-slot write commits before navigation and cannot overwrite a concurrent payout.
 localStorage.setItem(walletKey+'-'+item.slot,id);
}
