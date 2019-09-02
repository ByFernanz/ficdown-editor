var Player, blockToAction, blockToScene, conditionsMet, extractBlocks, getBlockType, matchAnchor, matchAnchors, matchHref, normalize, parseBlocks, parseText, regexLib, splitAltText, toBoolHash, trimText, scrollAct=true;

element=document.getElementById('gamecontent');

parseText = function(text) {
  var blocks, lines, story;
  lines = text.split(/\n|\r\n/);
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
  function Player(story, id, startText, endText,scrollText) {
    if (scrollText != null & scrollText != true){
      scrollAct=false;
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
    this.container.html(this.converter.makeHtml("#" + this.story.name + "\n\n" + this.story.description + "\n\n[" + this.startText + "](/" + this.story.firstScene + ")"));
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
    if(scrollAct==false){
      document.getElementById('main').innerHTML='';
    }
    this.container.append($('<span/>').attr('id', scrollId));
    newHtml=newHtml.replace("<!--<script>","<script>");
    newHtml=newHtml.replace("<!-- <script>","<script>");
    newHtml=newHtml.replace("<p><script>","<script>");
    newHtml=newHtml.replace("</script>-->","</script>");
    newHtml=newHtml.replace("</script> -->","</script>");
    newHtml=newHtml.replace("</script></p>","</script>");
    newHtml=newHtml.replace("<!--<style>","<style>");
    newHtml=newHtml.replace("<p><style>","<style>");
    newHtml=newHtml.replace("</style>-->","</style>");
    newHtml=newHtml.replace("</style></p>","</style>");
    this.container.append(newHtml);
    if(scrollAct==false){
      pfadeIn(element,400);
    }
    this.wireLinks();
    this.checkGameOver();
    return this.container.parent('.container').animate({
      scrollTop: $("#" + scrollId).offset().top - this.container.offset().top
    }, 1000);
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

function pfadeIn(el, time) {
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
