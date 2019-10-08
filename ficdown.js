var Player, blockToAction, blockToScene, conditionsMet, extractBlocks, getBlockType, matchAnchor, matchAnchors, matchHref, normalize, parseBlocks, parseText, regexLib, splitAltText, toBoolHash, trimText, scrollAct=true, debugAct=false, element, preprocessor={},test;

parseText = function(text) {
  var blocks, lines, story, headerCount=0, documento=[],preline='';
  var sceneNoHeader=true,
  	  sceneNoFooter=true,
  	  actionNoHeader=true,
  	  actionNoFooter=true;
  preprocessor={};
  preprocessor.sceneHeader="";
  preprocessor.sceneFooter="";
  preprocessor.actionHeader="";
  preprocessor.actionFooter="";
  preprocessor.constants={};
  lines = text.split(/\n|\r\n/);
  lines.forEach(function(line,index){
  	var splitProp;
    if(line.substring(0,3)=='***' || line.substring(0,3)=='---'){
      headerCount+=1;
    }else if(headerCount==1 && line[0]=='@'){
    	line=line.replace('@','');
    	splitProp=line.split(': ');
    	if(splitProp[0]=='scene-header'){
    		preprocessor.sceneHeader+=splitProp[1];
    	}else if(splitProp[0]=='scene-footer'){
    		preprocessor.sceneFooter+=splitProp[1];
    	}else if(splitProp[0]=='action-header'){
    		preprocessor.actionHeader+=splitProp[1];
    	}else if(splitProp[0]=='action-footer'){
    		preprocessor.actionFooter+=splitProp[1];
    	}
    }else if(headerCount==1){
    	splitProp=line.split(': ');
    	preprocessor.constants[String(splitProp[0])]=splitProp[1];
    }else if(headerCount==0 || headerCount>=2){	
    	if(line.substring(0,3)=='## ' && preline==''){
    		preline='scene';
    		documento.push(line);
    		if(preprocessor.sceneHeader!=''){
    			documento.push('');
    			documento.push(preprocessor.sceneHeader);
    			documento.push('');
    		}
    		
    	}else if(line.substring(0,4)=='### ' && preline==''){
    		preline='action';
    		documento.push(line);
    		if(preprocessor.actionHeader!=''){
    			documento.push('');
    			documento.push(preprocessor.actionHeader);
    			documento.push('');
    		}
    		
    	}else if(line.substring(0,3)=='## ' && preline=='scene'){
    		preline='scene';
    		if(preprocessor.sceneFooter!=''){
    			documento.push('');
    			documento.push(preprocessor.sceneFooter);
    			documento.push('');
    		}
    		documento.push(line);
    		if(preprocessor.sceneHeader!=''){
    			documento.push('');
    			documento.push(preprocessor.sceneHeader);
    			documento.push('');
    		}
    		
    	}else if(line.substring(0,4)=='### ' && preline=='action'){
    		preline='action';
    		if(preprocessor.actionFooter!=''){
    			documento.push('');
    			documento.push(preprocessor.actionFooter);
    			documento.push('');
    		}
    		documento.push(line);
    		if(preprocessor.actionHeader!=''){
    			documento.push('');
    			documento.push(preprocessor.actionHeader);
    			documento.push('');
    		}
    		
    	}else if(line.substring(0,3)=='## ' && preline=='action'){
    		preline='scene';
    		if(preprocessor.actionFooter!=''){
    			documento.push('');
    			documento.push(preprocessor.actionFooter);
    			documento.push('');
    		}
    		documento.push(line);
    		if(preprocessor.sceneHeader!=''){
    			documento.push('');
    			documento.push(preprocessor.sceneHeader);
    			documento.push('');
    		}
    		
    	}else if(line.substring(0,4)=='### ' && preline=='scene'){
    		preline='action';
    		if(preprocessor.sceneFooter!=''){
    			documento.push('');
    			documento.push(preprocessor.sceneFooter);
    			documento.push('');
    		}
    		documento.push(line);
    		if(preprocessor.actionHeader!=''){
    			documento.push('');
    			documento.push(preprocessor.actionHeader);
    			documento.push('');
    		}
    	}else{
    		for(prop in  preprocessor.constants){
    			line = line.replace('__'+prop.toUpperCase()+'__', preprocessor.constants[prop]);
    		}
    		documento.push(line);
    	}
    }
  });
  test=documento;
  lines=documento;
  blocks = extractBlocks(lines);
  return story = parseBlocks(blocks);
};

getBlockType = function(hashCount) {
  switch (hashCount) {
    case 1:
      return 'story';
    case 2:
      return 'scene';
    case 3:
      return 'action';
  }
};

extractBlocks = function(lines) {
  var blocks, currentBlock, line, match, _i, _len;
  blocks = [];
  currentBlock = null;
  for (_i = 0, _len = lines.length; _i < _len; _i++) {
    line = lines[_i];
    match = line.match(/^(#{1,3})\s+([^#].*)$/);
    if (match != null) {
      if (currentBlock !== null) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        type: getBlockType(match[1].length),
        name: match[2],
        lines: []
      };
    } else {
      currentBlock.lines.push(line);
    }
  }
  if (currentBlock !== null) {
    blocks.push(currentBlock);
  }
  return blocks;
};

parseBlocks = function(blocks) {
  var action, block, scene, story, storyBlock, storyHref, storyName, _i, _j, _len, _len1;
  storyBlock = null;
  for (_i = 0, _len = blocks.length; _i < _len; _i++) {
    block = blocks[_i];
    if (block.type === 'story') {
      storyBlock = block;
      break;
    }
  }
  storyName = matchAnchor(storyBlock.name);
  storyHref = matchHref(storyName.href);
  story = {
    name: storyName.text,
    description: trimText(storyBlock.lines.join("\n")),
    firstScene: storyHref.target,
    scenes: {},
    actions: {}
  };
  for (_j = 0, _len1 = blocks.length; _j < _len1; _j++) {
    block = blocks[_j];
    switch (block.type) {
      case 'scene':
        scene = blockToScene(block);
        if (!story.scenes[scene.key]) {
          story.scenes[scene.key] = [];
        }
        story.scenes[scene.key].push(scene);
        break;
      case 'action':
        action = blockToAction(block);
        story.actions[action.state] = action;
    }
  }
  return story;
};

blockToScene = function(block) {
  var conditions, href, key, scene, sceneName, title;
  sceneName = matchAnchor(block.name);
  if (sceneName != null) {
    title = sceneName.title != null ? trimText(sceneName.title) : trimText(sceneName.text);
    key = normalize(sceneName.text);
    href = matchHref(sceneName.href);
    if ((href != null ? href.conditions : void 0) != null) {
      conditions = toBoolHash(href.conditions.split('&'));
    }
  } else {
    title = trimText(block.name);
    key = normalize(block.name);
  }
  return scene = {
    name: title !== '' ? title : null,
    key: key,
    description: trimText(block.lines.join("\n")),
    conditions: conditions != null ? conditions : null
  };
};

blockToAction = function(block) {
  var action;
  return action = {
    state: normalize(block.name),
    description: trimText(block.lines.join("\n"))
  };
};

Player = (function() {
  function Player(story, id, startText, endText,scrollText,debug) {
    if (scrollText != null && scrollText != true){
      scrollAct=false;
    }
    if (debug != null && debug != false){
      debugAct=true;
    }
    var i, key, scene, scenes, _i, _len, _ref;
    this.story = story;
    this.id = id;
    this.startText = startText != null ? startText : "Click to start...";
    this.endText = endText != null ? endText : '## The End\n\nYou have reached the end of this story. <a id="restart" href="">Click here</a> to start over.';
    this.converter = new Markdown.Converter();
    this.container = $("#" + this.id);
    this.container.addClass('ficdown').data('player', this);
    this.playerState = {};
    this.visitedScenes = {};
    this.preprocessor=preprocessor;
    this.currentScene = null;
    this.moveCounter = 0;
    i = 0;
    _ref = this.story.scenes;
    for (key in _ref) {
      scenes = _ref[key];
      for (_i = 0, _len = scenes.length; _i < _len; _i++) {
        scene = scenes[_i];
        scene.id = "s" + (++i);
      }
    }
  }

  Player.prototype.play = function() {
    startHtml=this.converter.makeHtml("#" + this.story.name + "\n\n" + this.story.description + "\n\n[" + this.startText + "](/" + this.story.firstScene + ")");
    startHtml=startHtml.replace("<!--<script","<script");
    startHtml=startHtml.replace("<!-- <script","<script");
    startHtml=startHtml.replace("<p><script","<script");
    startHtml=startHtml.replace("</script>-->","</script>");
    startHtml=startHtml.replace("</script> -->","</script>");
    startHtml=startHtml.replace("</script></p>","</script>");
    startHtml=startHtml.replace("<!--<style>","<style>");
    startHtml=startHtml.replace("<!-- <style>","<style>");
    startHtml=startHtml.replace("<p><style>","<style>");
    startHtml=startHtml.replace("</style>-->","</style>");
    startHtml=startHtml.replace("</style> -->","</style>");
    startHtml=startHtml.replace("</style></p>","</style>");
    startHtml=startHtml.replace("<!--<iframe>","<iframe>");
    startHtml=startHtml.replace("<!-- <iframe>","<iframe>");
    startHtml=startHtml.replace("<p><iframe>","<iframe>");
    startHtml=startHtml.replace("</iframe>-->","</iframe>");
    startHtml=startHtml.replace("</iframe> -->","</iframe>");
    startHtml=startHtml.replace("</iframe></p>","</iframe>");
    startHtml=startHtml.replace("<!--<audio","<audio");
    startHtml=startHtml.replace("<!-- <audio","<audio");
    startHtml=startHtml.replace("<p><audio","<audio");
    startHtml=startHtml.replace("</audio>-->","</audio>");
    startHtml=startHtml.replace("</audio> -->","</audio>");
    startHtml=startHtml.replace("</audio></p>","</audio>");
    if(debugAct==true){
    	startHtml+="<div id=\"debug\" class=\"debug\"><div class=\"titulo-debug\">MODO DE DEPURACIÓN</div></div>";
    }
    this.container.html(startHtml);
    return this.wireLinks();
  };

  Player.prototype.wireLinks = function() {
    return this.container.find('a:not(.disabled):not(.external)').each(function(i) {
      var $this;
      $this = $(this);
      if ($this.attr('href').match(/^https?:\/\//) == null) {
        return $this.click(function() {
          var player;
          $this.addClass('chosen');
          player = $this.parents('.ficdown').data('player');
          player.handleHref($this.attr('href'));
          return false;
        });
      } else {
        return $this.addClass('external');
      }
    });
  };

  Player.prototype.resolveDescription = function(description) {
    var alts, anchor, conditions, href, newAnchor, replace, satisfied, _i, _len, _ref;
    _ref = matchAnchors(description);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      anchor = _ref[_i];
      href = matchHref(anchor.href);
      if (href.conditions != null) {
        conditions = toBoolHash(href.conditions.split('&'));
        satisfied = conditionsMet(this.playerState, conditions);
        alts = splitAltText(anchor.text);
        replace = satisfied ? alts.passed : alts.failed;
        if (replace == null) {
          replace = '';
        }
        replace = replace.replace(regexLib.escapeChar, '');
        if (replace === '' || ((href.toggles == null) && (href.target == null))) {
          description = description.replace(anchor.anchor, replace);
        } else {
          newAnchor = "[" + replace + "](" + (href.target != null ? "/" + href.target : "") + (href.toggles != null ? "#" + href.toggles : "") + ")";
          description = description.replace(anchor.anchor, newAnchor);
        }
      }
    }
    description = description.replace(regexLib.emptyListItem, '');
    return description;

  };

  Player.prototype.disableOldLinks = function() {
    return this.container.find('a:not(.external)').each(function(i) {
      var $this;
      $this = $(this);
      $this.addClass('disabled');
      $this.unbind('click');
      return $this.click(function() {
        return false;
      });
    });
  };

  Player.prototype.processHtml = function(sceneid, html) {
    var temp;
    temp = $('<div/>').append($.parseHTML(html));
    if (this.visitedScenes[sceneid]) {
      temp.find('blockquote').remove();
    } else {
      temp.find('blockquote').each(function(i) {
        var $this;
        $this = $(this);
        return $this.replaceWith($this.html());
      });
    }
    return temp.html();
  };

  Player.prototype.checkGameOver = function() {
    if (this.container.find('a:not(.disabled):not(.external)').length === 0) {
      this.container.append(this.converter.makeHtml(this.endText));
      return $('#restart').data('info', [this.id, this.story]).click(function() {
        var info, player;
        info = $(this).data('info');
        $("#" + info[0]).empty();
        player = new Player(info[1], info[0]);
        $("#" + info[0]).data('player', player);
        player.play();
        return false;
      });
    }
  };

  Player.prototype.handleHref = function(href) {
    var action, actions, match, matchedScene, newContent, newHtml, newScene, scene, scrollId, toggle, toggles, _i, _j, _k, _len, _len1, _len2, _ref;
    match = matchHref(href);
    matchedScene = null;
    actions = [];
    if ((match != null ? match.toggles : void 0) != null) {
      toggles = match.toggles.split('+');
      for (_i = 0, _len = toggles.length; _i < _len; _i++) {
        toggle = toggles[_i];
        if (this.story.actions[toggle] != null) {
          action = $.extend({}, this.story.actions[toggle]);
          action.description = this.resolveDescription(action.description);
          actions.push(action);
        }
        this.playerState[toggle] = true;
      }
    }
    if ((match != null ? match.target : void 0) != null) {
      if (this.story.scenes[match.target] != null) {
        _ref = this.story.scenes[match.target];
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          scene = _ref[_j];
          if (conditionsMet(this.playerState, scene.conditions)) {
            if ((matchedScene == null) || (scene.conditions == null) || (matchedScene.conditions == null) || Object.keys(scene.conditions).length > Object.keys(matchedScene.conditions).length) {
              matchedScene = scene;
            }
          }
        }
      }
    }
    //prueba
    if (matchedScene != null) {
      this.currentScene = matchedScene;
      
    }
    newScene = $.extend({}, this.currentScene);
    newScene.description = this.resolveDescription(newScene.description);
    
    this.disableOldLinks();
    newContent = "";
    if (newScene.name != null) {
      newContent += "##" + newScene.name + "\n\n";
    }
    for (_k = 0, _len2 = actions.length; _k < _len2; _k++) {
      action = actions[_k];
      newContent += "" + action.description + "\n\n";
    }   
    newContent += newScene.description;
    newHtml = this.processHtml(newScene.id, this.converter.makeHtml(newContent));
    this.visitedScenes[newScene.id] = true;
    scrollId = "move-" + (this.moveCounter++);
    
    // Informacion de debug
    	if(debugAct==true){
    	document.getElementById("debug").remove();
    	newHtml+="<div id=\"debug\" class=\"debug\"><div class=\"titulo-debug\">MODO DE DEPURACIÓN</div><div class=\"titulo-escena-actual\">ESCENA ACTUAL</div><div class=\"escena-actual\">&nbsp;"+this.currentScene["key"]+"</div>";
    	var primeraLinea=true;
    	if(JSON.stringify(this.playerState) !=false){
    	for(var estado in this.playerState){
    			if(primeraLinea==true){
    				newHtml+="<div class=\"titulo-estado\">ESTADO DEL JUGADOR</div><ul class=\"lista-estado\">";
    				primeraLinea=false;
    			}
    			if(this.playerState[estado]==true){
    				newHtml+='<li><b>' + estado + '</b></li>';
    			}
    	}
    	}
    	if(!primeraLinea){
    		newHtml += '</ul>';
    	}
    	newHtml+="</div>";
    }
    // fin de debug
    this.container.append($('<span/>').attr('id', scrollId));
    newHtml=newHtml.replace("<!--<script","<script");
    newHtml=newHtml.replace("<!-- <script","<script");
    newHtml=newHtml.replace("<p><script","<script");
    newHtml=newHtml.replace("</script>-->","</script>");
    newHtml=newHtml.replace("</script> -->","</script>");
    newHtml=newHtml.replace("</script></p>","</script>");
    newHtml=newHtml.replace("<!--<style>","<style>");
    newHtml=newHtml.replace("<!-- <style>","<style>");
    newHtml=newHtml.replace("<p><style>","<style>");
    newHtml=newHtml.replace("</style>-->","</style>");
    newHtml=newHtml.replace("</style> -->","</style>");
    newHtml=newHtml.replace("</style></p>","</style>");
    newHtml=newHtml.replace("<!--<iframe>","<iframe>");
    newHtml=newHtml.replace("<!-- <iframe>","<iframe>");
    newHtml=newHtml.replace("<p><iframe>","<iframe>");
    newHtml=newHtml.replace("</iframe>-->","</iframe>");
    newHtml=newHtml.replace("</iframe> -->","</iframe>");
    newHtml=newHtml.replace("</iframe></p>","</iframe>");
    newHtml=newHtml.replace("<!--<audio","<audio");
    newHtml=newHtml.replace("<!-- <audio","<audio");
    newHtml=newHtml.replace("<p><audio","<audio");
    newHtml=newHtml.replace("</audio>-->","</audio>");
    newHtml=newHtml.replace("</audio> -->","</audio>");
    newHtml=newHtml.replace("</audio></p>","</audio>");
   if(scrollAct==false){
      pfadeIn(this.id,400);
    }
    if(scrollAct==false){
      document.getElementById(this.id).innerHTML='';
    }
    this.container.append(newHtml);
    this.wireLinks();
    this.checkGameOver();
    if(scrollAct==true){
    	return this.container.parent('.container').animate({
     	 scrollTop: $("#" + scrollId).offset().top - this.container.offset().top
   		 }, 1000);
    }
  };

  return Player;

})();

regexLib = {
  anchors: /(\[((?:[^\[\]]+|\[(?:[^\[\]]+|\[(?:[^\[\]]+|\[(?:[^\[\]]+|\[(?:[^\[\]]+|\[(?:[^\[\]]+|\[\])*\])*\])*\])*\])*\])*)\]\([ ]*((?:[^()\s]+|\((?:[^()\s]+|\((?:[^()\s]+|\((?:[^()\s]+|\((?:[^()\s]+|\((?:[^()\s]+|\(\))*\))*\))*\))*\))*\))*)[ ]*((['"])(.*?)\5[ ]*)?\))/gm,
  href: /^(?:\/([a-zA-Z](?:-?[a-zA-Z0-9])*))?(?:\?((?:!?[a-zA-Z](?:-?[a-zA-Z0-9])*)(?:&!?[a-zA-Z](?:-?[a-zA-Z0-9])*)*)?)?(?:#((?:[a-zA-Z](?:-?[a-zA-Z0-9])*)(?:\+[a-zA-Z](?:-?[a-zA-Z0-9])*)*))?$/,
  trim: /^\s+|\s+$/g,
  altText: /^((?:[^|\\]|\\.)*)(?:\|((?:[^|\\]|\\.)+))?$/,
  escapeChar: /\\(?=[^\\])/g,
  emptyListItem: /^[ ]*-\s*([\r\n]+|$)/gm
};

matchAnchor = function(text) {
  var match, re, result;
  re = new RegExp(regexLib.anchors);
  match = re.exec(text);
  if (match != null) {
    result = {
      anchor: match[1],
      text: match[2],
      href: match[3],
      title: match[6]
    };
    if (result.href.indexOf('"') === 0) {
      result.title = result.href.substring(1, result.href.length - 1);
      result.href = '';
    }
    return result;
  }
  return match;
};

matchAnchors = function(text) {
  var anchor, anchors, match, re;
  re = new RegExp(regexLib.anchors);
  anchors = [];
  while (match = re.exec(text)) {
    anchor = {
      anchor: match[1],
      text: match[2],
      href: match[3],
      title: match[6]
    };
    if (anchor.href.indexOf('"') === 0) {
      anchor.title = anchor.href.substring(1, anchor.href.length - 1);
      anchor.href = '';
    }
    anchors.push(anchor);
  }
  return anchors;
};

trimText = function(text) {
  return text.replace(regexLib.trim, '');
};

matchHref = function(href) {
  var match, re, result;
  re = new RegExp(regexLib.href);
  match = re.exec(href);
  if (match != null) {
    result = {
      target: match[1],
      conditions: match[2],
      toggles: match[3]
    };
    return result;
  }
  return match;
};

normalize = function(text) {
  return text.toLowerCase().replace(/^\W+|\W+$/g, '').replace(/\W+/g, '-');
};

toBoolHash = function(names) {
  var hash, name, _i, _len;
  if (names == null) {
    return null;
  }
  hash = {};
  for (_i = 0, _len = names.length; _i < _len; _i++) {
    name = names[_i];
    if (name.indexOf('!') === 0) {
      hash[name.substring(1, name.length)] = false;
    } else {
      hash[name] = true;
    }
  }
  return hash;
};

conditionsMet = function(state, conditions) {
  var cond, met, val;
  met = true;
  for (cond in conditions) {
    val = conditions[cond];
    if ((val && !state[cond]) || (!val && state[cond])) {
      met = false;
      break;
    }
  }
  return met;
};

splitAltText = function(text) {
  var match, re, result;
  re = new RegExp(regexLib.altText);
  match = re.exec(text);
  if (match != null) {
    result = {
      passed: match[1],
      failed: match[2]
    };
    return result;
  }
};

function pfadeIn(element, time) {
  var el=document.getElementById(element);
  el.style.opacity = 0;
  var last = +new Date();
  var tick = function() {
    el.style.opacity = +el.style.opacity + (new Date() - last) / time;
    last = +new Date();

    if (+el.style.opacity < 1) {
      (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16);
    }
  };

  tick();
}
