const casas = [

{
titulo:"Casa en Sopocachi",
descripcion:"Casa moderna con 4 habitaciones cerca del centro.",
precio:"$200000",
coords:[-16.508,-68.123],
categoria:"alto"
},

{
titulo:"Casa en Achumani",
descripcion:"Casa grande con jardín y garaje.",
precio:"$150000",
coords:[-16.540,-68.080],
categoria:"medio"
},

{
titulo:"Casa económica",
descripcion:"Casa accesible ideal para familias.",
precio:"$80000",
coords:[-16.480,-68.150],
categoria:"economico"
}

];

let map = L.map('map').setView([-16.5,-68.15],12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom:19
}).addTo(map);

function cargarCasas(){

let cont = document.getElementById("listaCasas");

cont.innerHTML="";

casas.forEach((c,i)=>{

let div = document.createElement("div");

div.className="casa";

div.innerHTML = `

<h3>${c.titulo}</h3>

<p>${c.precio}</p>

<button onclick="mostrarCasa(${i})">
Ver información
</button>

`;

cont.appendChild(div);

let marker = L.marker(c.coords).addTo(map);

marker.bindPopup(`<b>${c.titulo}</b><br>${c.precio}`);

});

}

function mostrarCasa(i){

document.getElementById("tituloCasa").innerText = casas[i].titulo;

document.getElementById("descripcionCasa").innerText =
casas[i].descripcion + " Precio: " + casas[i].precio;

document.getElementById("infoCasa").style.display="block";

}

cargarCasas();