package net.triotmetki.packbadge
{
    import flash.display.DisplayObject;
    import flash.display.DisplayObjectContainer;
    import flash.events.Event;
    import flash.events.IEventDispatcher;
    import flash.geom.Rectangle;
    import flash.text.TextField;
    import flash.utils.Dictionary;
    import flash.utils.clearTimeout;
    import flash.utils.setTimeout;

    public final class BadgePainter
    {
        private static const PANEL_FIELDS:Array = ["playersPanel", "epicRandomPlayersPanel"];
        private static const PANEL_EVENTS:Array = [Event.CHANGE, "onItemsCountChange", "stateChanged"];
        private static const PANEL_LISTS:Array = ["listLeft", "listRight"];
        private static const LIST_EVENT:String = "itemsCountChange";
        private static const PANEL_NAMES:Array = ["playerNameFullTF", "playerNameCutTF"];
        private static const PANEL_BACKGROUNDS:Array = ["bg", "selfBg", "deadBg", "normAltBg", "deadAltBg"];
        private static const TAB_FIELD:String = "fullStats";
        private static const TAB_TABLE:String = "statsTable";
        private static const TAB_ICONS:String = "vehicleIconCollection";
        private static const TAB_NAMES:String = "playerNameCollection";
        private static const LOADING_FIELD:String = "battleLoading";
        private static const LOADING_FORM:String = "form";
        private static const LOADING_CONTAINER:String = "container";
        private static const LOADING_SIDES:Array = [["vehicleIconsAlly", "textFieldsAlly"], ["vehicleIconsEnemy", "textFieldsEnemy"]];
        private static const CUT_MARK:String = "..";
        private static const NAME_ENDS:Array = ["..", "[", " "];
        private static const MIN_CUT_NAME:int = 4;
        private static const ROW_WIDTH:Number = 339;
        private static const ICON_WIDTH:Number = 63;
        private static const ROW_HEIGHT:Number = 25;
        private static const MIN_SLOT_HEIGHT:Number = 22;
        private static const SETTLE_MS:Number = 150;

        private var page:IEventDispatcher;
        private var onGone:Function;
        private var panel:IEventDispatcher;
        private var panelField:String;
        private var watched:Array = [];
        private var names:Dictionary = new Dictionary();
        private var nameList:Array = [];
        private var decors:Dictionary = new Dictionary(true);
        private var settleId:uint = 0;
        private var anchor:Rectangle = new Rectangle();
        private var row:Rectangle = new Rectangle();
        private var slots:int = 0;
        private var rows:int = 0;
        private var drawn:int = 0;
        private var waiting:int = 0;

        public function BadgePainter(page:IEventDispatcher, onGone:Function)
        {
            this.page = page;
            this.onGone = onGone;
            page.addEventListener(Event.REMOVED_FROM_STAGE, this.onPageRemoved, false, 0, true);
        }

        public function mark(ids:Array, markedNames:Array, otherNames:Array):String
        {
            this.names = new Dictionary();
            this.nameList = [];
            this.addNames(markedNames, true);
            this.addNames(otherNames, false);

            var status:String = this.repaint();

            return status + " | names " + this.nameList.length + ", ids " + ids.length;
        }

        public function repaint():String
        {
            this.attachPanel();
            var status:String = this.paint();
            this.settleLater();

            return status;
        }

        private function addNames(shownNames:Array, isMarked:Boolean):void
        {
            for each (var name:* in shownNames)
            {
                var isNew:Boolean = name is String && name != "" && this.names[name] === undefined;
                if (isNew)
                {
                    this.names[name] = isMarked;
                    this.nameList.push(name);
                }
            }
        }

        public function dispose():void
        {
            if (this.settleId != 0)
            {
                clearTimeout(this.settleId);
                this.settleId = 0;
            }
            for each (var entry:Array in this.watched)
            {
                try
                {
                    entry[0].removeEventListener(entry[1], this.onChanged);
                }
                catch (error:Error)
                {
                }
            }
            for each (var decor:RowDecor in this.decors)
            {
                decor.detach();
            }
            if (this.page != null)
            {
                this.page.removeEventListener(Event.REMOVED_FROM_STAGE, this.onPageRemoved);
            }
            this.watched = [];
            this.decors = new Dictionary(true);
            this.panel = null;
            this.page = null;
        }

        private function paint():String
        {
            try
            {
                var panel:String = this.paintPanel();
                var table:String = this.paintTable();
                var loading:String = this.paintLoading();

                return "panel " + panel + " | tab " + table + " | loading " + loading;
            }
            catch (error:Error)
            {
                return "error " + error.message;
            }
            return "";
        }

        private function attachPanel():void
        {
            if (this.panel != null)
            {
                return;
            }
            for each (var field:String in PANEL_FIELDS)
            {
                var found:IEventDispatcher = read(this.page, field) as IEventDispatcher;
                if (found != null && this.panel == null)
                {
                    this.panel = found;
                    this.panelField = field;
                }
            }
            if (this.panel == null)
            {
                return;
            }
            for each (var type:String in PANEL_EVENTS)
            {
                this.listen(this.panel, type);
            }
            for each (var side:String in PANEL_LISTS)
            {
                this.listen(read(this.panel, side), LIST_EVENT);
            }
        }

        private function listen(target:Object, type:String):void
        {
            if (target == null)
            {
                return;
            }
            try
            {
                target.addEventListener(type, this.onChanged, false, 0, true);
                this.watched.push([target, type]);
            }
            catch (error:Error)
            {
            }
        }

        private function paintPanel():String
        {
            if (this.panel == null)
            {
                return "not found (no page." + PANEL_FIELDS.join(" or page.") + ")";
            }
            this.resetCounts();
            var lists:int = 0;
            for each (var side:String in PANEL_LISTS)
            {
                var list:DisplayObjectContainer = read(this.panel, side) as DisplayObjectContainer;
                if (list != null)
                {
                    lists++;
                    this.paintPanelList(list);
                }
            }
            return this.panelField + " lists " + lists + ", items " + this.slots + ", " + this.counts();
        }

        private function paintPanelList(list:DisplayObjectContainer):void
        {
            for (var index:int = 0; index < list.numChildren; index++)
            {
                var child:DisplayObjectContainer = list.getChildAt(index) as DisplayObjectContainer;
                if (child == null)
                {
                    continue;
                }
                if (firstOf(child, PANEL_NAMES) != null)
                {
                    this.paintPanelRow(child);
                    continue;
                }
                for (var nested:int = 0; nested < child.numChildren; nested++)
                {
                    var item:DisplayObjectContainer = child.getChildAt(nested) as DisplayObjectContainer;
                    if (item != null && firstOf(item, PANEL_NAMES) != null)
                    {
                        this.paintPanelRow(item);
                    }
                }
            }
        }

        private function paintPanelRow(item:DisplayObjectContainer):void
        {
            this.slots++;
            var shown:String = null;
            for each (var field:String in PANEL_NAMES)
            {
                shown = shown || textOf(read(item, field) as TextField);
            }
            if (shown == null)
            {
                return;
            }
            this.rows++;
            if (!this.isMarked(shown))
            {
                this.undecorate(item);
                return;
            }
            this.measurePanelRow(item);
            var decor:RowDecor = this.decorFor(item);
            decor.attach(item, backgroundTop(item) + 1, true);
            decor.layout(this.anchor, this.row, true);
            this.drawn++;
        }

        private function paintTable():String
        {
            var table:Object = read(read(this.page, TAB_FIELD), TAB_TABLE);
            var icons:Object = read(table, TAB_ICONS);
            var shownNames:Object = read(table, TAB_NAMES);
            if (icons == null || shownNames == null)
            {
                return "not found (no page." + TAB_FIELD + "." + TAB_TABLE + "." + TAB_NAMES + ")";
            }
            this.resetCounts();
            for (var index:int = 0; index < shownNames.length && index < icons.length; index++)
            {
                this.paintSlot(icons[index] as DisplayObject, shownNames[index] as TextField, false);
            }
            return TAB_FIELD + "." + TAB_TABLE + " cells " + this.slots + ", " + this.counts();
        }

        private function paintLoading():String
        {
            var form:DisplayObjectContainer = read(read(this.page, LOADING_FIELD), LOADING_FORM) as DisplayObjectContainer;
            if (form == null)
            {
                return "not found (no page." + LOADING_FIELD + "." + LOADING_FORM + ")";
            }
            var container:Object = form.getChildByName(LOADING_CONTAINER);
            if (container == null)
            {
                return "not found (no " + LOADING_FORM + "." + LOADING_CONTAINER + ")";
            }
            this.resetCounts();
            for each (var side:Array in LOADING_SIDES)
            {
                var icons:Object = read(container, side[0]);
                var shownNames:Object = read(container, side[1]);
                for (var index:int = 0; icons != null && shownNames != null && index < shownNames.length && index < icons.length; index++)
                {
                    this.paintSlot(icons[index] as DisplayObject, shownNames[index] as TextField, true);
                }
            }
            return LOADING_FORM + "." + LOADING_CONTAINER + " slots " + this.slots + ", " + this.counts();
        }

        private function paintSlot(icon:DisplayObject, name:TextField, withPlate:Boolean):void
        {
            if (icon == null || icon.parent == null || name == null)
            {
                return;
            }
            this.slots++;
            var shown:String = name.visible ? textOf(name) : null;
            if (shown == null)
            {
                this.undecorate(icon);
                return;
            }
            this.rows++;
            if (!this.isMarked(shown))
            {
                this.undecorate(icon);
                return;
            }
            var container:DisplayObjectContainer = icon.parent;
            if (!this.measureSlot(container, icon, name))
            {
                this.undecorate(icon);
                this.waiting++;
                return;
            }
            var decor:RowDecor = this.decorFor(icon);
            decor.attach(container, lowestIndex(container, icon, name), withPlate);
            decor.layout(this.anchor, this.row, withPlate);
            this.drawn++;
        }

        private function isMarked(shown:String):Boolean
        {
            var end:int = shown.length;
            for each (var ending:String in NAME_ENDS)
            {
                var at:int = shown.indexOf(ending);
                if (at >= 0 && at < end)
                {
                    end = at;
                }
            }
            var visible:String = shown.substring(0, end);
            var isCut:Boolean = shown.indexOf(CUT_MARK) == end;
            if (!isCut)
            {
                return this.names[visible] === true;
            }
            if (visible.length < MIN_CUT_NAME)
            {
                return false;
            }

            var match:String = this.onlyNameStartingWith(visible);

            return match != null && this.names[match] === true;
        }

        private function onlyNameStartingWith(prefix:String):String
        {
            var match:String = null;
            for each (var name:String in this.nameList)
            {
                if (name.indexOf(prefix) != 0)
                {
                    continue;
                }
                if (match != null)
                {
                    return null;
                }
                match = name;
            }
            return match;
        }

        private function measurePanelRow(item:DisplayObjectContainer):void
        {
            var icon:Rectangle = boundsIn(read(item, "vehicleIcon") as DisplayObject, item);
            var hit:Rectangle = boundsIn(read(item, "hit") as DisplayObject, item);
            if (icon != null)
            {
                copy(icon, this.anchor);
            }
            else
            {
                this.anchor.x = ROW_WIDTH - ICON_WIDTH;
                this.anchor.y = 0;
                this.anchor.width = ICON_WIDTH;
                this.anchor.height = ROW_HEIGHT;
            }
            if (hit != null)
            {
                copy(hit, this.row);
            }
            else
            {
                this.row.x = this.anchor.right - ROW_WIDTH;
                this.row.y = 0;
                this.row.width = ROW_WIDTH;
                this.row.height = ROW_HEIGHT;
            }
        }

        private function measureSlot(container:DisplayObjectContainer, iconObject:DisplayObject, nameObject:DisplayObject):Boolean
        {
            var icon:Rectangle = boundsIn(iconObject, container);
            if (icon == null)
            {
                return false;
            }
            var name:Rectangle = boundsIn(nameObject, container) || icon;
            var outwardRight:Boolean = icon.x + icon.width / 2 >= name.x + name.width / 2;
            copy(icon, this.anchor);
            var height:Number = Math.max(MIN_SLOT_HEIGHT, icon.height);
            this.row.x = Math.min(name.left, this.anchor.left);
            this.row.width = Math.max(name.right, this.anchor.right) - this.row.x;
            this.row.y = icon.y + icon.height / 2 - height / 2;
            this.row.height = height;
            return true;
        }

        private function decorFor(key:Object):RowDecor
        {
            var decor:RowDecor = this.decors[key];
            if (decor == null)
            {
                decor = new RowDecor();
                this.decors[key] = decor;
            }
            return decor;
        }

        private function undecorate(key:Object):void
        {
            var decor:RowDecor = this.decors[key];
            if (decor != null)
            {
                decor.detach();
                delete this.decors[key];
            }
        }

        private function resetCounts():void
        {
            this.slots = 0;
            this.rows = 0;
            this.drawn = 0;
            this.waiting = 0;
        }

        private function counts():String
        {
            return "names read " + this.rows + ", marked " + this.drawn + (this.waiting > 0 ? ", not drawn yet " + this.waiting : "");
        }

        private function settleLater():void
        {
            if (this.settleId == 0)
            {
                this.settleId = setTimeout(this.onSettle, SETTLE_MS);
            }
        }

        private function onSettle():void
        {
            this.settleId = 0;
            try
            {
                this.paint();
            }
            catch (error:Error)
            {
            }
        }

        private function onChanged(event:Event):void
        {
            try
            {
                this.settleLater();
            }
            catch (error:Error)
            {
            }
        }

        private function onPageRemoved(event:Event):void
        {
            var gone:Function = this.onGone;
            var page:IEventDispatcher = this.page;
            try
            {
                this.dispose();
                gone(page);
            }
            catch (error:Error)
            {
            }
        }

        private static function textOf(field:TextField):String
        {
            return field != null && field.text != "" ? field.text : null;
        }

        private static function backgroundTop(item:DisplayObjectContainer):int
        {
            var top:int = -1;
            for each (var field:String in PANEL_BACKGROUNDS)
            {
                var background:DisplayObject = read(item, field) as DisplayObject;
                if (background != null && background.parent == item)
                {
                    top = Math.max(top, item.getChildIndex(background));
                }
            }
            return top;
        }

        private static function lowestIndex(container:DisplayObjectContainer, icon:DisplayObject, name:DisplayObject):int
        {
            var index:int = container.getChildIndex(icon);
            if (name != null && name.parent == container)
            {
                index = Math.min(index, container.getChildIndex(name));
            }
            return index;
        }

        private static function boundsIn(target:DisplayObject, space:DisplayObject):Rectangle
        {
            if (target == null)
            {
                return null;
            }
            var bounds:Rectangle = target.getBounds(space);
            return bounds.width > 0 && bounds.height > 0 ? bounds : null;
        }

        private static function copy(source:Rectangle, target:Rectangle):void
        {
            target.x = source.x;
            target.y = source.y;
            target.width = source.width;
            target.height = source.height;
        }

        private static function firstOf(target:*, names:Array):*
        {
            for each (var name:String in names)
            {
                var value:* = read(target, name);
                if (value != null)
                {
                    return value;
                }
            }
            return null;
        }

        private static function read(target:*, name:String):*
        {
            if (target == null)
            {
                return null;
            }
            try
            {
                return target[name];
            }
            catch (error:Error)
            {
            }
            return null;
        }
    }
}
