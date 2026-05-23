/**
 * Created by XXQ on 2017/4/10.
 */
    function popupInit(ptype, message,confirm,cancel){
    	var htmlstr = null;
    	var tiptit;
    	var queren;
    	var quxiao;
    	if (parent.current_lang == 1) {
    		tiptit = '提示';
    		queren = '确认';
    		quxiao = '取消'
    	} else {
    		tiptit = 'Message';
    		queren = 'OK';
    		quxiao = 'Cancel'
    	}
    	
    	if (ptype == 0)
    		htmlstr = '<div class="pop-container"><div class="pop-mask"></div><div class="pop-content"><div class="pop-title clearfix"><div class="pop-titleText">'+tiptit+'</div><div class="pop-closeBtn"><div class="icon-close"></div></div></div><div class="pop-main"><div class="pop-mainText">提示框信息</div></div><div class="pop-btnBox clearfix" style="margin-top: 10px; margin-left: 142px;"><input class="blue-btn" type="button" value="'+queren+'"/></div></div></div>';
    	else if (ptype == 1)
    		htmlstr = '<div class="pop-container"><div class="pop-mask"></div><div class="pop-content"><div class="pop-title clearfix"><div class="pop-titleText">'+tiptit+'</div><div class="pop-closeBtn"><div class="icon-close"></div></div></div><div class="pop-main"><div class="pop-mainText">提示框信息</div></div><div class="pop-btnBox clearfix" style="margin-top: 10px; margin-left: 50px;"><input class="blue-btn" type="button" value="'+queren+'"/><input class="yellow-btn" type="button" value="'+quxiao+'"/></div></div></div>';
        $(document.body).append($(htmlstr));
        $('.pop-main .pop-mainText').html(message);
        $(document).on('click','.pop-closeBtn',function(){
            $(document.body).find('.pop-container').remove();
        });
        $('.pop-btnBox .blue-btn').on('click',function(){
        	if (confirm)
            	confirm();
            $(document.body).find('.pop-container').remove();
        });
        $('.pop-btnBox .yellow-btn').on('click',function(){
        	if (cancel)
            	cancel();
            $(document.body).find('.pop-container').remove();
        })
    }


