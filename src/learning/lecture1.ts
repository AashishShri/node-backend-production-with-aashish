// partial

// type Tuser = {
//     name :string,
//     age: number
// }

// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// const user1:Tuser  ={
//     name : 'Aashu',
//     age: 20
// }

// type TPartialUser = Partial<Tuser>;

// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// const user2:TPartialUser  ={
//     name : 'Aashish'
// }

 // pick

//  type TUserName = Pick<Tuser,'name'>

//  const userName : TUserName = {name: 'BB' }


//omit

// type Tuser = {
//     name :string,
//     age: number
// }

// type TUserNameWithoutAge = Omit<Tuser,'age'>

// const userWithoutAge : TUserNameWithoutAge= {name:'aashish'}


//readonly

// interface IUser {
//     name : string,
//     email : string
// }

// type TReadOnlyUser = Readonly<IUser>

// const user :TReadOnlyUser ={
//     name :  'Aashu',
//     email : 'Aashish@gmail.com'
// }
// user.name = 'Aas' // we cann't update bcoz all value is readonly will get an error

//record

// type TPage= 'home' | 'about' | 'contact'
// type TMetaInfo ={
//     title :string;
// }

 
// const pages: Record<TPage, TMetaInfo> ={
//     home:{
//         title :'HomePage'
//     },
//     about:{
//         title :'AboutPage'
//     },
//     contact:{
//         title :'ContactPage'
//     },
// }