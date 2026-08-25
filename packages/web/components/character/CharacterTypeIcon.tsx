import { Role } from '../../lib/types'

function CharacterTypeIcon({ jobType, width, height }: {
    jobType: Role; width?: number; height?: number;
}) {
    const imageIcon = jobType === "DEALER" ? "/ico_equi.png" : "/ico_buff.png"

    return <img src={imageIcon} width={width ?? 15} height={height ?? 15} />

}

export default CharacterTypeIcon