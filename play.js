var closeGame,loadGame,makePlayable,playGame;

loadGame=function(e){
	var a;
	return a=$(e).find("pre").text()
		,playGame(a)
},
playGame=function(e){
	var a;
	return a=parseText(e),
		$("#overlay").show(),
		$("#playpopup").show(),
		new Player(a,"gamecontent",'<br><center>COMENZAR A JUGAR</center>','## FIN\n\nEl juego ha terminado.', true).play()
},
closeGame=function(){
	return $("#gamecontent").empty(),
		$("#playpopup").hide(),
		$("#overlay").hide()
},
makePlayable=function(e){
	return $(e).append($("<label/>").attr("class","control").append($("<a/>").attr("href","#").text("Play »").click(function(){return loadGame(e),!1})))},
		$(document).ready(function(){
			var e,a,r,n;
			for(a=0,r=(n=$("code.playable")).length;a<r;a++)
				e=n[a],makePlayable(e);
			return $("#gameclose").click(function(){return closeGame(),!1}),$("#overlay").click(function(){return closeGame()}),
				$("#preview").click(function(){try{juego=playGame(simplemde.value())}catch(e){e,alert("There was an error, which could mean a bug in Ficdown.js or a problem with your story.")}return!1})});
