$(function() {
	$(document).on('click', '.box-check', function() {
		if($(this).hasClass('click')) {
			$(this).removeClass('click');
			$(this).find('input').prop('checked', false);
		} else {
			$(this).closest('li').siblings('li').find('.box-check').removeClass('click');
			$(this).addClass('click');
			$(this).closest('li').siblings('li').find('input').prop('checked', false);
			$(this).find('input').prop('checked', true);
		}
	});

	$(document).on('click', '.square-check', function() {
		if($(this).hasClass('click')) {
			$(this).removeClass('click');
			$(this).find('input').prop('checked', false);
		} else {
			$(this).addClass('click');
			$(this).find('input').prop('checked', true);
		}
	});

	if(!('placeholder' in document.createElement('input'))) {

		$('input[placeholder],textarea[placeholder]').each(function() {
			var that = $(this),
				text = that.attr('placeholder');
			if(that.val() === "") {
				that.val(text).addClass('placeholder');
			}
			that.focus(function() {
					if(that.val() === text) {
						that.val("").removeClass('placeholder');
					}
				})
				.blur(function() {
					if(that.val() === "") {
						that.val(text).addClass('placeholder');
					}
				})
				.closest('form').submit(function() {
					if(that.val() === text) {
						that.val('');
					}
				});
		});
	}
	$('.main-top').on('click', function() {
		var iconTri = $(this).find('.triangle_toggle');
		if(iconTri) {
			var content = $(this).siblings('.param-message');
			if($(iconTri).hasClass('open')) {
				$(iconTri).removeClass('open');
				$(content).removeClass('block');
				$(content).addClass('none');
			} else {
				$(iconTri).addClass('open');
				$(content).removeClass('none');
				$(content).addClass('block');
			}
		}
	});

	$(".mt_toggle").mouseleave(function() {
		$(this).css('cursor', 'default');
	});
	$(".mt_toggle").mouseenter(function() {
		$(this).css('cursor', 'pointer');
	});
});

function setCheckBoxStyle(checkClassName) {
	$(checkClassName).find('input[type=checkbox]:checked').parent(checkClassName).addClass('click');
	$(checkClassName).find('input[type=checkbox]').not(':checked').parent(checkClassName).removeClass('click');
}

var gIsAjaxShowErrFlag = true;
var gIsAjaxRdrOpFailed = false;

function apiCall(reqjson, apiname, successCB, errcodeCB, ajaxerrCB) {
	$.ajax({
		data: reqjson,
		type: "post",
		timeout: 15000,
		contentType: "application/json; charset=utf-8",
		url: "/moduleapi/" + apiname,
		success: function(result) {
			if(result.err_code != 0) {
				hideMask();
				gIsAjaxRdrOpFailed = true;
				if(errcodeCB)
					errcodeCB(result);
				else {
					if (gIsAjaxShowErrFlag) {
						if (parent.current_lang == 1)
							sl_alert('执行 ' + apiname + '失败，错误信息：' + result.err_string);
						else
							sl_alert('Excute ' + apiname + ' failed，error information：' + result.err_string);
					}						
				}		
			} else {
				if(successCB)
					successCB(result);
				else
					hideMask();
			}
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			hideMask();
			if(ajaxerrCB)
				ajaxerrCB(errorThrown);
			else {
				if (parent.current_lang == 1)
					sl_alert('调用服务' + apiname + '-' + reqjson + '出错:' + textStatus);
				else
					sl_alert('Call service ' + apiname + '-' + reqjson + ' failed, error: ' + textStatus);
			}
		}
	});
}

function apiCall_ShowMask(reqjson, apiname, successCB) {
	showMask();
	apiCall(reqjson, apiname, function(sudata) {
		hideMask();
		successCB(sudata);
	});
}

function apiChainCall(ccain, succfn) {
	showMask();
	if(ccain.length == 0) {
		hideMask();
		if(succfn)
			succfn();
		return;
	}
	apiCall(ccain[0].reqjson, ccain[0].apiname, function(data) {
		if(ccain[0].succfunc)
			ccain[0].succfunc(ccain[0].succdata, data);
		ccain.splice(0, 1);
		apiChainCall(ccain, succfn);
	})
}

function getInteger(id, min, max, tip) {
	var tmpstr = $('#' + id).val();
	var str = $.trim(tmpstr);
	if(str.length != 0) {
		if(str.match(/^(0|[1-9]\d*)$/)) {
			var gint = parseInt(str);
			if(gint <= max && gint >= min)
				return gint;
		}
	}
	sl_alert(tip);
	return null;
}

function getRadioIndex(prefix, start, end, tip) {
	for(var i = start; i <= end; ++i) {
		if($('#' + prefix + i).is(':checked')) {
			return i;
		}
	}
	if(tip)
		sl_alert(tip);
	return null;
}

function getSelectVal(id, tip, isint) {
	var str = $('#' + id).val();
	if(str != '') {
		if(isint)
			return parseInt(str);
		else
			return str;
	}
	sl_alert(tip);
	return null;
}

function getBoolean(name, tip) {
	var ret = null;
	if($('#' + name + 'yes').is(':checked'))
		ret = true;
	if($('#' + name + 'no').is(':checked'))
		ret = false;
	if(ret == null) {
		if(tip)
			sl_alert(tip);
	}
	return ret;
}

function getCBNumArray(prefix, start, end, tip) {
	var arr = [];
	for(var i = start; i <= end; ++i) {
		if($('#' + prefix + i).is(':checked'))
			arr.push(i);
	}
	if(arr.length > 0)
		return arr;

	sl_alert(tip);
	return null;
}

function getBinString(id, maxlen, tip) {
	var tmpstr = $('#' + id).val();
	var str = $.trim(tmpstr);
	if(str.length > 0 && str.length <= maxlen) {
		if(str.match(/^[01]+$/))
			return str;
	}
	sl_alert(tip);
	return null;
}

function getBlkHexString(id, maxlen, tip) {
	var tmpstr = $('#' + id).val();
	var str = $.trim(tmpstr);
	if(str.length > 0 && str.length <= maxlen &&
		str.length % 4 == 0) {
		if(str.match(/^([0-9]|[a-f]|[A-F])+$/))
			return str;
	}
	sl_alert(tip);
	return null;
}

function getHexString(id, maxlen, tip) {
	var tmpstr = $('#' + id).val();
	var str = $.trim(tmpstr);
	if(str.length > 0 && str.length <= maxlen) {
		if(str.match(/^([0-9]|[a-f]|[A-F])+$/))
			return str;
	}
	sl_alert(tip);
	return null;
}

function getHexPassword(id, tip) {
	var tmpstr = $('#' + id).val();
	var str = $.trim(tmpstr);
	if(str.length == 8) {
		if(str.match(/^([0-9]|[a-f]|[A-F]){8}$/))
			return str;
	} else if(str.length == 0)
		return '0';

	sl_alert(tip);
	return '-1';
}

function getIpAddress(id, tip) {
	var tmpstr = $('#' + id).val();
	var str = $.trim(tmpstr);
	if(str.length > 0) {
		if(str.match(/^(?:(?:1[0-9][0-9]\.)|(?:2[0-4][0-9]\.)|(?:25[0-5]\.)|(?:[1-9][0-9]\.)|(?:[0-9]\.)){3}(?:(?:1[0-9][0-9])|(?:2[0-4][0-9])|(?:25[0-5])|(?:[1-9][0-9])|(?:[0-9]))$/))
			return str;
	}
	sl_alert(tip);
	return null;
}

function parseTagfilter(tag_filter) {
	var issettf = false;
	var tmpstr = $.trim($('#tfstartaddr').val());
	if(tmpstr.length > 0)
		issettf = true;
	var tmpstr = $.trim($('#tfmask').val());
	if(tmpstr.length > 0)
		issettf = true;
	if(getRadioIndex('tfbank', 1, 3) != null)
		issettf = true;
	if(getBoolean('tfmatch') != null)
		issettf = true;

	if(issettf) {
		if (parent.current_lang == 1)
			tag_filter.start_bit = getInteger('tfstartaddr', 0, 495, "过滤起始地址输入错误 ");
		else
			tag_filter.start_bit = getInteger('tfstartaddr', 0, 495, "Filter start address input error ");
		if(tag_filter.start_bit == null)
			return -1;
			
		if (parent.current_lang == 1)
			tag_filter.mask = getBinString('tfmask', 496, '过滤掩码输入错误');
		else
			tag_filter.mask = getBinString('tfmask', 496, 'Filter mask input error');
		if(tag_filter.mask == null)
			return -1;
	
		if (parent.current_lang == 1)
			tag_filter.bank = getRadioIndex('tfbank', 1, 3, '请选择过滤BANK');
		else
			tag_filter.bank = getRadioIndex('tfbank', 1, 3, 'Please select a filter bank');
		if(tag_filter.bank == null)
			return -1;
			
		if (parent.current_lang == 1)
			tag_filter.match = getBoolean('tfmatch', '请选择过滤匹配模式');
		else
			ag_filter.match = getBoolean('tfmatch', 'Please select filter matching mode');
		if(tag_filter.match == null)
			return -1;
		
		return 0;
	} else
		return 1;
}

function showMask(zIndex) {
	var mask = document.getElementById("silion_mask");
	if(!mask) {
		var temp = document.createElement("div");
		temp.innerHTML = '<div id="silion_mask" style="position:fixed;top:0;left:0;width:100%;height:100%;visibility:hidden;"><div style="position:absolute;top:0;left:0;width:100%;height:100%;background-color:#000;filter:alpha(opacity=0);opacity:0.0;"></div><div style="position:absolute;top:50%;left:50%;width:60px;height:60px;margin:-30px 0 0 -30px; border-radius:12px;overflow:hidden;"><img src="../images/timg.gif" width="80px" height="80px" style="margin-top:-11px;margin-left:-11px;" /></div></div>';
		mask = temp.childNodes[0];
		temp = null;
		document.body.appendChild(mask);
		if(!zIndex) zIndex = 99;
		mask.style.zIndex = zIndex;
		mask.style.visibility = "visible";
	}
}

function hideMask() {
	var mask = document.getElementById("silion_mask");
	if(mask) {
		mask.style.visibility = "hidden";
		mask.parentNode.removeChild(mask);
	}
}

function showNumber(number, zIndex) {
	var mask = document.getElementById("silion_number");
	if(!mask) {
		var temp = document.createElement("div");
		temp.innerHTML = '<div id="silion_number" style="position:fixed;top:0;left:0;width:100%;height:100%;visibility:hidden;"><div style="position:absolute;top:0;left:0;width:100%;height:100%;background-color:#000;filter:alpha(opacity=0); opacity:0.0;"></div><div style="position:absolute;top:50%;left:0;width:100%;height:180px;line-height:180px;margin:-90px 0 0 0;border-radius:12px;overflow:hidden;text-align: center;font-size:180px;color: red;">' + number + '</div></div>';
		mask = temp.childNodes[0];
		temp = null;
		document.body.appendChild(mask);
		if(!zIndex) zIndex = 99;
		mask.style.zIndex = zIndex;
		mask.style.visibility = "visible";
	}
}

function hideNumber() {
	var mask = document.getElementById("silion_number");
	if(mask) {
		mask.style.visibility = "hidden";
		mask.parentNode.removeChild(mask);
	}
}

function sl_alert(tip, yf, nf) {

	if(window.top == window.self) {
		popupInit(0, tip, yf, nf);
	} else {
		parent.poptip(0, tip, yf, nf);
	}
}

function sl_confirm(tip, yf, nf) {

	if(window.top == window.self) {
		popupInit(1, tip, yf, nf);
	} else {
		parent.poptip(1, tip, yf, nf);
	}
}

function addhtmltagopant(aid) {
	var htmlant = '<li><div class="box-check clearfix"><input type="checkbox" class="checkbox" value="checkname" name="checkname" id="opant' + aid + '">' +
		'<em class="icon-draw"></em></div><div class="check-mess" id="textant' + aid + '" style="color: red; ">';
	if (parent.current_lang == 1)
		htmlant += '天线' + aid + '</div></li>';
	else
		htmlant += 'Ant' + aid + '</div></li>';
	$('#antennalist').append($(htmlant));
}

function inittagopants() {
		for(var i = 0; i < parent.antenna_ports_number; ++i)
			addhtmltagopant(i + 1);
		for(var i = 0; i < parent.connectants.length; ++i)
			$('#textant' + parent.connectants[i]).css('color', 'green');
		if (parent.antenna_ports_number == 1) {
			$('#opant1')[0].checked = true;
			setCheckBoxStyle('.box-check');
		}
}

function getASC2String(id, maxlen, tip) {
	
	var tmpstr = $('#' + id).val();
	var str = $.trim(tmpstr);
	var reg = new RegExp("[\\u4E00-\\u9FFF]+","g");
	if(str.length > 0 && str.length <= maxlen && (!reg.test(str))) {
		var pos = str.indexOf("/");
		if(pos < 0)
			return str;
	}
	sl_alert(tip);
	return null;	
}