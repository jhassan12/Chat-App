$(document).ready(function(){

	var prevCaretPos = 0;
	var prevSelection = null;
    
//	var alphabet = "abcdef".split("");
//	alphabet.each(function(letter) {
////	  $('.emotion-area').append('<img scr="img/1f60${letter}.png"');
//		console.log(letter);
//	});
	
	function ApndImgEmotion() {
		for (var i = 65; i <= 70; i++) {
			$('.emotion-area').append(
				'<img width="20px" height="20px" src="/img/1f60' + String.fromCharCode(i).toLowerCase() + '.png">' + 
				'<img width="20px" height="20px" src="/img/1f61' + String.fromCharCode(i).toLowerCase() + '.png">' + 
				'<img width="20px" height="20px" src="/img/1f62' + String.fromCharCode(i).toLowerCase() + '.png">' + 
				'<img width="20px" height="20px" src="/img/1f47' + String.fromCharCode(i).toLowerCase() + '.png">' +
				'<img width="20px" height="20px" src="/img/1f49' + String.fromCharCode(i).toLowerCase() + '.png">'
			);
		}
		
		for (var i = 4; i <= 8; i++) {
			$('.emotion-area').append(
				'<img width="20px" height="20px" src="/img/1f32' + i + '.png">'
			);
		}
		
		for (var i = 3; i <= 8; i++) {
			$('.emotion-area').append(
				'<img width="20px" height="20px" src="/img/1f49' + i + '.png">'
			);
		}
		
		for (var i = 0; i <= 9; i++) {
			$('.emotion-area').append(
				'<img width="20px" height="20px" src="/img/1f60' + i + '.png">'
			);
		}
		
		for (var i = 10; i <= 44; i++) {
			$('.emotion-area').append(
				'<img width="20px" height="20px" src="/img/1f6' + i + '.png">'
			);
		}
		
		for (var i = 10; i <= 17; i++) {
			$('.emotion-area').append(
				'<img width="20px" height="20px" src="/img/1f9' + i + '.png">'
			);
		}
	}
	
//	$(document).one('click' , '.emotion-Icon', function(e){
//		ApndImgEmotion();
//	});

	$(document).on('click', function(e){
		var emotionArea = $('.emotion-area');
		
		if (!$('.emotion-Icon').find($(e.target)).length && !$('.emotion').find($(e.target)).length && emotionArea.hasClass('ShowImotion')) {
			if ($(document.activeElement).hasClass('select-text') && getSelectionHtml().length) return;

			emotionArea.removeClass('ShowImotion');
			$('.emotion-area').empty();
			emotionArea.removeClass('top');
			$('.emotion').hide()
		}
	});
	
	$(document).on('click' , '.emotion-Icon', function(e){
		var top = $(this).offset().top ,
			top = Math.floor(top),
			emotionArea = $('.emotion-area');
		
		emotionArea.toggleClass('ShowImotion');


		if( top <= 160 ){
			emotionArea.toggleClass('top');
		}
		
		if(!emotionArea.hasClass('ShowImotion')){
			$('.emotion-area').empty();
			emotionArea.removeClass('top');
			$('.emotion').hide()
		}else{
			ApndImgEmotion();
			$('.emotion').show()
		}
	});


	function getCharacterOffsetWithin_final(range, node) {
	    var treeWalker = document.createTreeWalker(
	        node,
	        NodeFilter.ELEMENT_NODE,
	        function(node) {
	            var nodeRange = document.createRange();
	            nodeRange.selectNodeContents(node);
	            return nodeRange.compareBoundaryPoints(Range.END_TO_END, range) < 1 ?
	                NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
	        },
	        false
	    );

	    var charCount = 0, lastNodeLength = 0;

	    if (range.startContainer.nodeType == 3) {
	        charCount += range.startOffset;
	    }

	    while (treeWalker.nextNode()) {
	        charCount += lastNodeLength;
	        lastNodeLength = 0;
	        
	        if(range.startContainer != treeWalker.currentNode) {
	            if(treeWalker.currentNode instanceof Text) {
	                lastNodeLength += treeWalker.currentNode.length;
	            } else if(treeWalker.currentNode instanceof HTMLBRElement ||
	                      treeWalker.currentNode instanceof HTMLImageElement /* ||
	                      treeWalker.currentNode instanceof HTMLDivElement*/)
	            {
	                lastNodeLength++;
	            }
	        }
	    }
	    
	    return charCount + lastNodeLength;
	}



	function isOrContainsNode(ancestor, descendant) {
	    var node = descendant;
	    while (node) {
	        if (node === ancestor) {
	            return true;
	        }
	        node = node.parentNode;
	    }
	    return false;
	}

	function insertNodeOverSelection(node, containerNode) {
	    var sel, range, html, str;

	    if (window.getSelection) {
	        sel = window.getSelection();
	        if (sel.getRangeAt && sel.rangeCount) {
	            range = sel.getRangeAt(0);
	            if (isOrContainsNode(containerNode, range.commonAncestorContainer)) {
	                range.deleteContents();
	                range.insertNode(node);
	            } else {
	                containerNode.appendChild(node);
	            }
	        }
	    } else if (document.selection && document.selection.createRange) {
	        range = document.selection.createRange();
	        if (isOrContainsNode(containerNode, range.parentElement())) {
	            html = (node.nodeType == 3) ? node.data : node.outerHTML;
	            range.pasteHTML(html);
	        } else {
	            containerNode.appendChild(node);
	        }
	    }
	}


	function getSelectionHtml() {
	    var html = "";
	    if (typeof window.getSelection != "undefined") {
	        var sel = window.getSelection();
	        if (sel.rangeCount) {
	            var container = document.createElement("div");
	            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
	                container.appendChild(sel.getRangeAt(i).cloneContents());
	            }
	            html = container.innerHTML;
	        }
	    } else if (typeof document.selection != "undefined") {
	        if (document.selection.type == "Text") {
	            html = document.selection.createRange().htmlText;
	        }
	    }
	    return html;
	}


 	function pasteHtmlAtCaret(html) { 
 		restoreSelection(prevSelection);
 		prevSelection = null;
 		
        let sel, range;
        if (window.getSelection) {

          // IE9 and non-IE
          sel = window.getSelection();
          if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();

            // Range.createContextualFragment() would be useful here but is
            // non-standard and not supported in all browsers (IE9, for one)
            const el = document.createElement("div");
            el.appendChild(html)
            let frag = document.createDocumentFragment(),
              node,
              lastNode;
            while ((node = el.firstChild)) {
              lastNode = frag.appendChild(node);
            }
            range.insertNode(frag);

            // Preserve the selection
            if (lastNode) {
              range = range.cloneRange();
              range.setStartAfter(lastNode);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
        } else if (document.selection && document.selection.type != "Control") {
          // IE < 9
          document.selection.createRange().pasteHTML(html);
        }
      }

	function setCaret(pos) {
	    var el = document.getElementById('user-input')
	    var range = document.createRange()
	    var sel = window.getSelection()

	 	var node = undefined;

	    for (const n of el.childNodes) {
	    	var nodeLength = n.textContent.length
	    	node = n

	    	if (n.nodeType !== 3 && n.tagName === "IMG") {
	    		nodeLength = 1
	    	}
	  
		   	if (nodeLength >= pos) {
	    		break;
	    	}

	    	pos -= nodeLength
	    }

		node = node || el

	   if (node.tagName === "IMG") {
	   		range.setStartAfter(node)
	   } else {
	   		range.setStart(node, pos)
	   }

	    range.collapse(true)
	    
	    sel.removeAllRanges()
	    sel.addRange(range)
	}	

	function updateCaretPos() {
		if (window.getSelection().anchorNode) {
			prevCaretPos = getCharacterOffsetWithin_final(window.getSelection().getRangeAt(0), $('#user-input')[0]);
		}
	}

	function updateSelection() {
		prevSelection = saveSelection();
	}

	function saveSelection() {
	    if (window.getSelection) {
	        sel = window.getSelection();
	        if (sel.getRangeAt && sel.rangeCount) {
	            return sel.getRangeAt(0);
	        }
	    } else if (document.selection && document.selection.createRange) {
	        return document.selection.createRange();
	    }
	    return null;
	}

	function restoreSelection(range) {
	    if (range) {
	        if (window.getSelection) {
	            sel = window.getSelection();
	            sel.removeAllRanges();
	            sel.addRange(range);
	        } else if (document.selection && range.select) {
	            range.select();
	        }
	    }
	}

	$('#user-input').on('keyup', updateCaretPos);
	$('#user-input').on('click', updateCaretPos);
	$('#user-input').on('input', updateCaretPos);


	$('.emotion-Icon .fa').on('mousedown', updateSelection);
	$('.emotion-area').on('mousedown', updateSelection);

	$(document).on('click' , '.emotion-area img', function(e){
		var imgIcon = $(this).clone()[0];
		setCaret(prevCaretPos);
		pasteHtmlAtCaret(imgIcon);
		$('#user-input').trigger('input')
	});
	
});













