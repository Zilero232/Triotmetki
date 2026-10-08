package net.triotmetki.packbadge
{
    public final class ClientFields
    {
        public static function panelHolders(list:*):*
        {
            try
            {
                return list._items;
            }
            catch (error:Error)
            {
            }
            return null;
        }

        public static function tableController(stats:*):*
        {
            try
            {
                return stats.tableCtrl;
            }
            catch (error:Error)
            {
            }
            return null;
        }

        public static function tableRenderers(controller:*, enemy:Boolean):*
        {
            try
            {
                return enemy ? controller.enemyRenderers : controller.allyRenderers;
            }
            catch (error:Error)
            {
            }
            return null;
        }

        public static function loadingRenderers(form:*, enemy:Boolean):*
        {
            try
            {
                return enemy ? form._enemyRenderers : form._allyRenderers;
            }
            catch (error:Error)
            {
            }
            return null;
        }

        public static function loadingVehicleID(renderer:*):Number
        {
            try
            {
                return renderer.model != null ? Number(renderer.model.vehicleID) : NaN;
            }
            catch (error:Error)
            {
            }
            return NaN;
        }

        public static function providers(owner:*):Array
        {
            try
            {
                return [owner._teamDP, owner._enemyDP];
            }
            catch (error:Error)
            {
            }
            return [];
        }
    }
}
